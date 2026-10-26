require('dotenv').config();
const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting seed...');
    await client.query('BEGIN');

    // ── 1. Users ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Password123!', 12);

    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
      VALUES
        ('admin@transport.com',    $1, 'Admin',   'User',   '9800000001', 'admin'),
        ('customer@example.com',   $1, 'Ravi',    'Sharma', '9800000002', 'customer'),
        ('fleet@transport.com',    $1, 'Priya',   'Patel',  '9800000003', 'fleet_manager'),
        ('customer2@example.com',  $1, 'Anita',   'Singh',  '9800000004', 'customer')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);
    console.log('  ✓ Users seeded');

    // ── 2. Vehicle Categories ──────────────────────────────────
    await client.query(`
      INSERT INTO vehicle_categories
        (name, slug, category, description, icon, supports_rental, supports_seat_booking, supports_charter, supports_goods, sort_order)
      VALUES
        ('Cars',          'cars',       'car',      'Passenger cars for personal travel',           'car',        TRUE,  FALSE, FALSE, FALSE, 1),
        ('Bikes',         'bikes',      'bike',     'Two-wheelers for quick city travel',            'bike',       TRUE,  FALSE, FALSE, FALSE, 2),
        ('Buses',         'buses',      'bus',      'Buses for group and intercity travel',          'bus',        FALSE, TRUE,  TRUE,  FALSE, 3),
        ('Mini Buses',    'mini-buses', 'mini_bus', 'Mini buses for group and event travel',         'mini-bus',   TRUE,  TRUE,  TRUE,  FALSE, 4),
        ('Tempo & Vans',  'tempo',      'tempo',    'Passenger tempos and vans for group travel',    'van',        TRUE,  FALSE, FALSE, FALSE, 5),
        ('Trucks',        'trucks',     'truck',    'Goods transport vehicles',                      'truck',      FALSE, FALSE, FALSE, TRUE,  6)
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log('  ✓ Vehicle categories seeded');

    // ── 3. Vehicle Types ───────────────────────────────────────
    const { rows: cats } = await client.query(
      'SELECT id, slug FROM vehicle_categories'
    );
    const catMap = {};
    cats.forEach((c) => (catMap[c.slug] = c.id));

    const vehicleTypes = [
      // Cars
      [catMap['cars'], 'Hatchback',      'hatchback',      5],
      [catMap['cars'], 'Sedan',          'sedan',          5],
      [catMap['cars'], 'SUV',            'suv',            7],
      [catMap['cars'], 'Luxury Car',     'luxury-car',     5],
      [catMap['cars'], 'Electric Car',   'electric-car',   5],
      // Bikes
      [catMap['bikes'], 'Scooter',        'scooter',        2],
      [catMap['bikes'], 'Motorcycle',     'motorcycle',     2],
      [catMap['bikes'], 'Electric Bike',  'electric-bike',  2],
      // Buses
      [catMap['buses'], 'AC Seater Bus',     'ac-seater-bus',     45],
      [catMap['buses'], 'Non-AC Seater Bus', 'non-ac-seater-bus', 45],
      [catMap['buses'], 'AC Sleeper Bus',    'ac-sleeper-bus',    36],
      [catMap['buses'], 'Semi-Sleeper Bus',  'semi-sleeper-bus',  36],
      // Mini Buses
      [catMap['mini-buses'], 'Mini Bus 12-Seater', 'mini-bus-12', 12],
      [catMap['mini-buses'], 'Mini Bus 20-Seater', 'mini-bus-20', 20],
      // Tempo
      [catMap['tempo'], 'Tempo Traveller 12',  'tempo-12',  12],
      [catMap['tempo'], 'Tempo Traveller 17',  'tempo-17',  17],
      [catMap['tempo'], 'Passenger Van',       'van',        8],
      // Trucks
      [catMap['trucks'], 'Mini Truck',   'mini-truck',   null],
      [catMap['trucks'], 'Pickup Truck', 'pickup-truck', null],
      [catMap['trucks'], 'Medium Truck', 'medium-truck', null],
    ];

    for (const [catId, name, slug, cap] of vehicleTypes) {
      await client.query(
        `INSERT INTO vehicle_types (category_id, name, slug, default_capacity)
         VALUES ($1, $2, $3, $4) ON CONFLICT (category_id, slug) DO NOTHING`,
        [catId, name, slug, cap]
      );
    }
    console.log('  ✓ Vehicle types seeded');

    // ── 4. Seat Layout ─────────────────────────────────────────
    const { rows: layoutRows } = await client.query(`
      INSERT INTO seat_layouts (name, description, rows, cols_lower, has_upper_deck)
      VALUES ('Standard 2+2 Seater', '40-seat standard layout', 10, 4, FALSE)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    let layoutId = layoutRows[0]?.id;
    if (!layoutId) {
      const r = await client.query(
        "SELECT id FROM seat_layouts WHERE name='Standard 2+2 Seater'"
      );
      layoutId = r.rows[0].id;
    }

    // Insert 40 seats (rows 1-10, A-D)
    const positions = ['window', 'aisle', 'aisle', 'window'];
    const cols = ['A', 'B', 'C', 'D'];
    for (let row = 1; row <= 10; row++) {
      for (let c = 0; c < 4; c++) {
        await client.query(`
          INSERT INTO seats (layout_id, seat_number, row_number, position, deck, seat_type)
          VALUES ($1, $2, $3, $4, 'single', 'seater')
          ON CONFLICT (layout_id, seat_number) DO NOTHING
        `, [layoutId, `${row}${cols[c]}`, row, positions[c]]);
      }
    }
    console.log('  ✓ Seat layout seeded (40 seats)');

    // ── 5. Sample Vehicles ─────────────────────────────────────
    const { rows: vtRows } = await client.query(
      'SELECT id, slug, category_id FROM vehicle_types'
    );
    const vtMap = {};
    vtRows.forEach((v) => (vtMap[v.slug] = { id: v.id, catId: v.category_id }));

    const vehicles = [
      // car
      {
        slug: 'sedan',   name: 'Toyota Corolla',    model: 'Corolla',  make: 'Toyota',
        fuel: 'petrol', trans: 'automatic', ac: true, pass: 5, price: 2500,
        method: 'daily', deposit: 5000, driver: true, driverCharge: 800,
        rental: true, seat: false, charter: false, goods: false,
        desc: 'Comfortable sedan for city and outstation trips',
      },
      {
        slug: 'suv', name: 'Toyota Fortuner', model: 'Fortuner', make: 'Toyota',
        fuel: 'diesel', trans: 'automatic', ac: true, pass: 7, price: 4500,
        method: 'daily', deposit: 10000, driver: true, driverCharge: 1000,
        rental: true, seat: false, charter: false, goods: false,
        desc: 'Spacious SUV for family trips and mountain drives',
      },
      // bike
      {
        slug: 'scooter', name: 'Honda Activa', model: 'Activa 6G', make: 'Honda',
        fuel: 'petrol', trans: 'automatic', ac: false, pass: 2, price: 400,
        method: 'daily', deposit: 1500, driver: false, driverCharge: 0,
        rental: true, seat: false, charter: false, goods: false,
        desc: 'Popular scooter for daily city commuting',
      },
      // bus
      {
        slug: 'ac-seater-bus', name: 'Volvo AC Seater', model: 'B9R', make: 'Volvo',
        fuel: 'diesel', trans: 'manual', ac: true, pass: 45, price: 600,
        method: 'seat_based', deposit: 0, driver: true, driverCharge: 0,
        rental: false, seat: true, charter: true, goods: false,
        desc: 'Comfortable AC bus for intercity travel with individual seat booking',
      },
      // mini bus
      {
        slug: 'mini-bus-12', name: 'Force Traveller 12', model: 'Traveller', make: 'Force',
        fuel: 'diesel', trans: 'manual', ac: true, pass: 12, price: 3500,
        method: 'daily', deposit: 5000, driver: true, driverCharge: 700,
        rental: true, seat: false, charter: true, goods: false,
        desc: '12-seater AC mini bus for group and event travel',
      },
      // tempo
      {
        slug: 'tempo-12', name: 'Force Tempo Traveller 12', model: 'Tempo Traveller', make: 'Force',
        fuel: 'diesel', trans: 'manual', ac: true, pass: 12, price: 18,
        method: 'per_km', deposit: 3000, driver: true, driverCharge: 0,
        rental: true, seat: false, charter: false, goods: false,
        desc: 'Tempo traveller for group outings and pilgrimages',
      },
      // truck
      {
        slug: 'mini-truck', name: 'Tata Ace Gold', model: 'Ace Gold', make: 'Tata',
        fuel: 'diesel', trans: 'manual', ac: false, pass: null, price: 15,
        method: 'per_km', deposit: 2000, driver: true, driverCharge: 0,
        rental: false, seat: false, charter: false, goods: true,
        desc: 'Mini truck for small goods delivery',
        cargoKg: 750, cargoCbm: 4,
      },
    ];

    for (const v of vehicles) {
      const vt = vtMap[v.slug];
      if (!vt) continue;
      await client.query(`
        INSERT INTO vehicles
          (category_id, vehicle_type_id, name, model, make, fuel_type, transmission, ac,
           passenger_capacity, cargo_capacity_kg, cargo_capacity_cbm,
           pricing_method, base_price, security_deposit,
           driver_available, driver_charge,
           supports_rental, supports_seat_booking, supports_charter, supports_goods,
           description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        ON CONFLICT DO NOTHING
      `, [
        vt.catId, vt.id, v.name, v.model, v.make, v.fuel, v.trans, v.ac,
        v.pass || null, v.cargoKg || null, v.cargoCbm || null,
        v.method, v.price, v.deposit,
        v.driver, v.driverCharge,
        v.rental, v.seat, v.charter, v.goods,
        v.desc,
      ]);
    }
    console.log('  ✓ Sample vehicles seeded');

    // ── 6. Sample Route ────────────────────────────────────────
    const { rows: routeRows } = await client.query(`
      INSERT INTO routes (origin, destination, distance_km)
      VALUES ('Mumbai', 'Pune', 148)
      ON CONFLICT (origin, destination) DO NOTHING
      RETURNING id;
    `);
    const routeId = routeRows[0]?.id || (
      await client.query("SELECT id FROM routes WHERE origin='Mumbai'")
    ).rows[0].id;

    await client.query(`
      INSERT INTO route_stops (route_id, stop_name, stop_order, distance_from_origin_km, arrival_offset_minutes)
      VALUES
        ($1, 'Mumbai - Dadar',       1,   0,   0),
        ($1, 'Khopoli',              2,  65,  60),
        ($1, 'Lonavala',             3,  83,  90),
        ($1, 'Pune - Shivajinagar',  4, 148, 155)
      ON CONFLICT (route_id, stop_order) DO NOTHING;
    `, [routeId]);
    console.log('  ✓ Sample route seeded');

    // ── 7. Sample Trip ─────────────────────────────────────────
    const { rows: busRows } = await client.query(
      "SELECT id FROM vehicles WHERE name='Volvo AC Seater' LIMIT 1"
    );
    if (busRows.length) {
      await client.query(`
        INSERT INTO trips
          (route_id, vehicle_id, layout_id, departure_time, arrival_time, travel_date, base_fare)
        VALUES
          ($1, $2, $3,
           NOW() + INTERVAL '2 days',
           NOW() + INTERVAL '2 days 3 hours',
           (NOW() + INTERVAL '2 days')::DATE,
           600)
        ON CONFLICT DO NOTHING;
      `, [routeId, busRows[0].id, layoutId]);
      console.log('  ✓ Sample trip seeded');
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Test credentials:');
    console.log('   Admin:    admin@transport.com    / Password123!');
    console.log('   Customer: customer@example.com   / Password123!');
    console.log('   Fleet:    fleet@transport.com    / Password123!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));

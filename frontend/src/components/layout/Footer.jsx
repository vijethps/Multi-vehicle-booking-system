import { Link } from 'react-router-dom'
import { Bus, Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">TransportHub</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your one-stop platform for booking cars, bikes, buses, tempos, and freight transport.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/vehicles?category=cars" className="hover:text-white transition-colors">Car Rental</Link></li>
              <li><Link to="/vehicles?category=bikes" className="hover:text-white transition-colors">Bike Rental</Link></li>
              <li><Link to="/buses" className="hover:text-white transition-colors">Bus Booking</Link></li>
              <li><Link to="/vehicles?category=tempo" className="hover:text-white transition-colors">Tempo Traveller</Link></li>
              <li><Link to="/trucks" className="hover:text-white transition-colors">Freight Transport</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>+91 98000 00001</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>support@transporthub.in</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>Mumbai, Maharashtra, India</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-800 mt-10 mb-6" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} TransportHub. All rights reserved.</p>
          <p>Built with React + Node.js + PostgreSQL</p>
        </div>
      </div>
    </footer>
  )
}

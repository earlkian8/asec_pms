import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Screenshots from './components/Screenshots'
import Highlights from './components/Highlights'
import DownloadCTA from './components/DownloadCTA'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white antialiased">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Screenshots />
      <Highlights />
      <DownloadCTA />
      <Footer />
    </div>
  )
}

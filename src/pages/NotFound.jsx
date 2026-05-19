import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <p className="hero-display text-[10rem] leading-none text-border select-none">404</p>
        <h1 className="text-3xl font-bold text-ink mt-4 mb-2">Page Not Found</h1>
        <p className="text-ink-secondary mb-8">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => window.history.back()} variant="secondary">Go Back</Button>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

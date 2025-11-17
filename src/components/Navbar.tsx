import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeb3 } from '@/contexts/Web3Context';
import { Wallet, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { account, isConnecting, connect } = useWeb3();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/mint', label: 'Mint NFT' },
    { href: '/activity', label: 'Activity' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/profile', label: 'Profile' },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover-glow">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
              <span className="text-2xl">🌸</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Sakura
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg transition-all duration-200',
                  location.pathname === link.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Connect Wallet Button */}
          <div className="hidden md:block">
            {account ? (
              <Button variant="outline" className="font-medium">
                <Wallet className="w-4 h-4 mr-2" />
                {formatAddress(account)}
              </Button>
            ) : (
              <Button 
                onClick={() => connect('metamask')} 
                disabled={isConnecting}
                className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 font-medium"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg transition-all',
                  location.pathname === link.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              {account ? (
                <Button variant="outline" className="w-full font-medium">
                  <Wallet className="w-4 h-4 mr-2" />
                  {formatAddress(account)}
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    connect('metamask');
                    setMobileMenuOpen(false);
                  }} 
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 font-medium"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

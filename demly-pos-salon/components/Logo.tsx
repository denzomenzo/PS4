export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'text-4xl',
    medium: 'text-5xl',
    large: 'text-6xl'
  };

  const logoSize = {
    small: 'w-32',
    medium: 'w-40',
    large: 'w-48'
  };

  return (
    <div className={`${logoSize[size]}`}>
      <svg viewBox="0 0 400 100" className="w-full h-auto">
        <defs>
          <linearGradient id="demly-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        
        {/* D */}
        <text 
          x="20" 
          y="60" 
          className="text-6xl font-black"
          fill="white"
          fontSize="80"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
        >
          D
        </text>
        
        {/* EMLY */}
        <text 
          x="80" 
          y="60" 
          className="text-6xl font-black"
          fill="url(#demly-gradient)"
          fontSize="80"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
        >
          EMLY
        </text>
        
        {/* Subtitle */}
        <text 
          x="20" 
          y="90" 
          className="text-xs tracking-widest"
          fill="#6b7280"
          fontSize="12"
          fontWeight="600"
          fontFamily="Arial, sans-serif"
          letterSpacing="0.2em"
        >
          Security, Software, Enterprise
        </text>
      </svg>
    </div>
  );
}

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-32 h-10',
    medium: 'w-40 h-12',
    large: 'w-48 h-14'
  };

  return (
    <div className={sizeClasses[size]}>
      <svg
        viewBox="0 0 400 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="demly-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* D character */}
        <text
          x="20"
          y="60"
          fontSize="72"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="white"
        >
          D
        </text>

        {/* EMLY characters with gradient */}
        <text
          x="80"
          y="60"
          fontSize="72"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="url(#demly-gradient)"
        >
          EMLY
        </text>

        {/* Subtitle */}
        <text
          x="20"
          y="90"
          fontSize="14"
          fontWeight="600"
          fontFamily="Arial, sans-serif"
          fill="#6B7280"
          letterSpacing="0.2em"
        >
          Security, Software, Enterprise
        </text>
      </svg>
    </div>
  );
}

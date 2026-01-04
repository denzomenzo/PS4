import Image from 'next/image';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  // Size mapping for consistency
  const sizeClasses = {
    small: { width: 120, height: 40 },    // w-32 h-10
    medium: { width: 160, height: 50 },   // w-40 h-12
    large: { width: 200, height: 60 }     // w-48 h-14
  };

  const dimensions = sizeClasses[size];

  return (
    <div className="relative">
      <Image
        src="/demlyllogo.svg"  // or /demlyllogo.png if you have PNG
        alt="DEMLY Logo"
        width={dimensions.width}
        height={dimensions.height}
        className="object-contain"
        priority
      />
    </div>
  );
}

import Image from 'next/image';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeConfigs = {
    small: { width: 160, height: 50, className: "w-40 h-12" },      // 40% larger
    medium: { width: 200, height: 60, className: "w-48 h-14" },     // 25% larger
    large: { width: 240, height: 70, className: "w-56 h-16" }       // 40% larger
  };

  const config = sizeConfigs[size];

  return (
    <div className={`relative ${config.className}`}>
      <Image
        src="/demlyllogo.svg"  // Make sure this file exists in /public/
        alt="DEMLY - Security, Software, Enterprise"
        width={config.width}
        height={config.height}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}

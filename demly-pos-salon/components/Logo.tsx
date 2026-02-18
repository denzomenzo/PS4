// components/Logo.tsx
import Image from 'next/image';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' | 'xlarge' }) {
  const sizeConfigs = {
    small: { width: 240, height: 75, className: "w-60 h-16" },      // 50% larger
    medium: { width: 320, height: 100, className: "w-80 h-20" },    // 60% larger
    large: { width: 400, height: 125, className: "w-96 h-24" },     // 67% larger
    xlarge: { width: 560, height: 175, className: "w-[35rem] h-44" } // Double large
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

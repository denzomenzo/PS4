// app/components/Logo.tsx
import Image from 'next/image';
import demlyLogo from '@/public/demlyllogo.png';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-10',
    large: 'h-12'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${sizeClasses[size]} aspect-[3/1]`}>
        <Image
          src={demlyLogo}
          alt="DEMLY Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
import Image from 'next/image';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-10',
    large: 'h-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]} aspect-[4/1]`}>
      <Image
        src="/demlyllogo.png"
        alt="DEMLY Logo"
        fill
        className="object-contain"
        priority
        sizes="(max-width: 768px) 120px, 240px"
      />
    </div>
  );
}

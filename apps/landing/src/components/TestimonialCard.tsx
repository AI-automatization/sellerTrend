interface TestimonialCardProps {
  name: string;
  shop: string;
  avatar: string;
  text: string;
  rating: number;
}

export function TestimonialCard({ name, shop, avatar, text, rating }: TestimonialCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 min-w-[300px] md:min-w-[360px]">
      <div className="flex gap-1">
        {Array.from({ length: rating }).map((_, i) => (
          <span key={i} className="text-warning text-sm">★</span>
        ))}
      </div>
      <p className="text-base-content/80 text-sm leading-relaxed italic">"{text}"</p>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-700 text-sm flex-shrink-0">
          {avatar}
        </div>
        <div>
          <p className="font-600 text-sm text-base-content">{name}</p>
          <p className="text-xs text-base-content/50">{shop}</p>
        </div>
      </div>
    </div>
  );
}

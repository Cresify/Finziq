import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PremiumLockCardProps = {
  title: string;
  description: string;
  compact?: boolean;
};

export default function PremiumLockCard({
  title,
  description,
  compact = false,
}: PremiumLockCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Crown className="w-5 h-5 text-amber-600" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">{title}</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            {description}
          </p>

          <button
            type="button"
            onClick={() =>
            navigate("/premium", { state: { from: title } })
            }
            className="mt-3 h-9 px-4 rounded-lg bg-amber-500 text-white text-sm font-medium"
            >
            Desbloquear Premium
          </button>
        </div>
      </div>
    </div>
  );
}
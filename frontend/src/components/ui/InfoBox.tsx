type Props = {
  label: string;
  value: string;
};

export default function InfoBox({ label, value }: Props) {
  return (
    <div className="rounded-2xl border bg-white/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}
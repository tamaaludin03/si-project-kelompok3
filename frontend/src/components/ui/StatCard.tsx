type Props = {
  title: string;
  value: string;
  desc: string;
};

export default function StatCard({
  title,
  value,
  desc,
}: Props) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-600">
        {title}
      </p>

      <div className="mt-2 flex items-end gap-1">
        <h2 className="text-3xl font-black text-purple-800">
          {value}
        </h2>

        <p className="pb-1 text-sm text-gray-500">
          {desc}
        </p>
      </div>
    </div>
  );
}
export default function EquipmentLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
      <p className="text-sm text-gray-500">Loading equipment...</p>
    </div>
  );
}

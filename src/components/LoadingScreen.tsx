export default function LoadingScreen({ label = 'Loading Health Tracker…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <p className="text-base font-medium text-slate-700">{label}</p>
      </div>
    </div>
  )
}

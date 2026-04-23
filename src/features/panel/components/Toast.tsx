'use client'
interface Props {
  message: string | null
  isError?: boolean
}
export default function Toast({ message, isError }: Props) {
  if (!message) return null
  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] px-4 py-2 rounded-toss text-sm font-medium shadow-toss-md
        ${isError ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}
    >
      {message}
    </div>
  )
}

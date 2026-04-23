'use client'

// Design Ref: §3 office_ips, §5.7 팀장 전용 사무실 IP 관리
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceService } from '../services'
import { useOfficeIps } from '../hooks/useMonthlyAttendance'
import { useServerIp } from '../hooks/useAttendance'

export default function OfficeIpManager() {
  const { data: ips, isLoading } = useOfficeIps()
  const { data: myIp } = useServerIp()
  const qc = useQueryClient()
  const [ipAddress, setIpAddress] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = useMutation({
    mutationFn: () => attendanceService.addOfficeIp(ipAddress.trim(), label.trim() || null),
    onSuccess: () => {
      setIpAddress('')
      setLabel('')
      setError(null)
      qc.invalidateQueries({ queryKey: ['attendance', 'office-ips'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => attendanceService.removeOfficeIp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'office-ips'] }),
  })

  const useMyIp = () => {
    if (myIp?.ip) setIpAddress(myIp.ip)
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">사무실 IP 관리</h3>
        {myIp && (
          <span className="text-xs text-gray-500">
            내 IP: <span className="font-mono">{myIp.ip}</span>
            {myIp.isOffice && (
              <span className="ml-1 text-green-600">· 사무실</span>
            )}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          placeholder="IP 주소 (예: 123.45.67.89)"
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          className="input flex-1 min-w-[160px] font-mono"
        />
        <input
          type="text"
          placeholder="설명 (예: 본점)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="input flex-1 min-w-[120px]"
        />
        <button
          onClick={useMyIp}
          type="button"
          className="btn-secondary whitespace-nowrap"
          disabled={!myIp?.ip}
        >
          내 IP 사용
        </button>
        <button
          onClick={() => add.mutate()}
          disabled={!ipAddress.trim() || add.isPending}
          className="btn-primary"
        >
          {add.isPending ? '추가 중...' : '+ 추가'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {isLoading && <div className="text-gray-400 text-sm">불러오는 중...</div>}
      {!isLoading && (!ips || ips.length === 0) && (
        <div className="text-gray-400 text-sm py-4 text-center">
          등록된 사무실 IP가 없습니다
        </div>
      )}
      <div className="space-y-1">
        {ips?.map((ip) => (
          <div
            key={ip.id}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-toss"
          >
            <span className="font-mono text-sm text-gray-900">{ip.ip_address}</span>
            {ip.label && <span className="text-xs text-gray-500">· {ip.label}</span>}
            <div className="flex-1" />
            <button
              onClick={() => {
                if (confirm('삭제하시겠습니까?')) remove.mutate(ip.id)
              }}
              className="text-xs text-red-500 hover:underline"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

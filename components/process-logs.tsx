'use client'

import { useState, useEffect } from 'react'
import { X, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Process } from '@/types/process'

interface ProcessLogsProps {
  process: Process
  onClose: () => void
}

export function ProcessLogs({ process, onClose }: ProcessLogsProps) {
  const [logs, setLogs] = useState<string[]>(process.logs || [])

  useEffect(() => {
    setLogs(process.logs || [])
  }, [process.logs])

  const downloadLogs = () => {
    const logContent = logs.join('\n')
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${process.name}-logs.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = async () => {
    // 这里可以添加清除日志的API调用
    console.log('清除日志功能需要后端支持')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                进程日志 - {process.name}
              </CardTitle>
              <CardDescription>
                命令: {process.command}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadLogs}
                className="flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                下载
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearLogs}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                清除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                关闭
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="h-full bg-gray-900 text-green-400 p-4 rounded-md overflow-y-auto font-mono text-sm">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1 leading-relaxed">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">暂无日志</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
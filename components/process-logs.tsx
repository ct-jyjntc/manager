'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Download, Trash2, RefreshCw, Play, Pause, ArrowDown, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Process } from '@/types/process'

interface ProcessLogsProps {
  process: Process
  onClose: () => void
  onProcessUpdate?: (updatedProcess: Process) => void
}

export function ProcessLogs({ process, onClose, onProcessUpdate }: ProcessLogsProps) {
  const [logs, setLogs] = useState<string[]>(process.logs || [])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    setLogs(process.logs || [])
    if (autoScroll) {
      scrollToBottom()
    }
  }, [process.logs, autoScroll])

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, process.id])

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      fetchLatestLogs()
    }, 2000) // 每2秒刷新一次日志（比主页面更频繁）
  }

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const fetchLatestLogs = async () => {
    try {
      const response = await fetch(`/api/processes/${process.id}`)
      if (response.ok) {
        const updatedProcess = await response.json()
        const newLogs = updatedProcess.logs || []
        
        // 检查是否有新日志
        const hasNewLogs = newLogs.length > logs.length
        
        setLogs(newLogs)
        setLastUpdateTime(new Date())
        setConnectionError(false)
        if (onProcessUpdate) {
          onProcessUpdate(updatedProcess)
        }
        
        // 如果有新日志且启用了自动滚动，则滚动到底部
        if (hasNewLogs && autoScroll) {
          setTimeout(() => {
            scrollToBottom()
          }, 100)
        }
      } else {
        setConnectionError(true)
      }
    } catch (error) {
      console.error('获取最新日志失败:', error)
      setConnectionError(true)
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await fetchLatestLogs()
    setIsRefreshing(false)
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    if (!autoRefresh) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
    if (!confirm('确定要清除所有日志吗？此操作不可逆。')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/processes/${process.id}/logs`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLogs([]);
        alert('日志已清除');
        // 立即刷新获取最新状态
        await fetchLatestLogs();
      } else {
        const error = await response.text();
        alert(`清除日志失败: ${error}`);
      }
    } catch (error) {
      console.error('清除日志失败:', error);
      alert('清除日志失败: 网络错误');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <Card className="w-full max-w-6xl h-[95vh] md:h-[85vh] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3 md:pb-4">
          <div className="flex flex-col gap-3">
            {/* 标题和描述 */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg md:text-xl mb-1 truncate">
                  进程日志 - {process.name}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm break-all">
                  命令: {process.command}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="flex-shrink-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 状态信息 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              {lastUpdateTime && (
                <span className="text-gray-500">
                  最后更新: {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
              <div className="flex items-center gap-1">
                {connectionError ? 
                  <WifiOff className="h-3 w-3 text-red-500" /> : 
                  <Wifi className="h-3 w-3 text-green-500" />
                }
                <span className={connectionError ? 'text-red-500' : 'text-green-500'}>
                  {connectionError ? '连接断开' : '实时同步'}
                </span>
              </div>
            </div>
            
            {/* 控制按钮组 - 移动端优化 */}
            <div className="flex flex-wrap gap-1 md:gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">手动刷新</span>
                <span className="sm:hidden">刷新</span>
              </Button>
              
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={toggleAutoRefresh}
                className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
              >
                {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span className="hidden sm:inline">{autoRefresh ? '暂停自动' : '开始自动'}</span>
                <span className="sm:hidden">{autoRefresh ? '暂停' : '开始'}</span>
              </Button>
              
              <Button
                size="sm"
                variant={autoScroll ? "default" : "outline"}
                onClick={() => setAutoScroll(!autoScroll)}
                className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
              >
                <ArrowDown className="h-3 w-3" />
                <span className="hidden sm:inline">{autoScroll ? '关闭自动滚动' : '开启自动滚动'}</span>
                <span className="sm:hidden">{autoScroll ? '关闭滚动' : '开启滚动'}</span>
              </Button>
              
              {!autoScroll && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={scrollToBottom}
                  className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
                >
                  <ArrowDown className="h-3 w-3" />
                  <span className="hidden sm:inline">滚动到底部</span>
                  <span className="sm:hidden">到底部</span>
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={downloadLogs}
                className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">下载日志</span>
                <span className="sm:hidden">下载</span>
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={clearLogs}
                className="flex items-center gap-1 h-8 text-xs px-2 md:px-3"
              >
                <Trash2 className="h-3 w-3" />
                <span className="hidden sm:inline">清空日志</span>
                <span className="sm:hidden">清空</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-3 md:p-6">
          <div className="h-full bg-gray-900 text-green-400 p-3 md:p-4 rounded-md overflow-y-auto font-mono text-xs md:text-sm leading-relaxed">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1 break-all">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">
                暂无日志数据
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
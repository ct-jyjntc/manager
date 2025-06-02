'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Play, Square, RotateCcw, Trash2, Activity, Server, FileText, Settings, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProcessLogs } from '@/components/process-logs'
import { ConfigManager } from '@/components/config-manager'
import { ServerManager } from '@/components/server-manager'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Process, Server as ServerType } from '@/types/process'

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [servers, setServers] = useState<ServerType[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('local')
  const [newProcessName, setNewProcessName] = useState('')
  const [newProcessCommand, setNewProcessCommand] = useState('')
  const [newProcessCwd, setNewProcessCwd] = useState('/root')
  const [loading, setLoading] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [showConfigManager, setShowConfigManager] = useState(false)
  const [showServerManager, setShowServerManager] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; processId: string; processName: string }>({
    show: false,
    processId: '',
    processName: ''
  })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    fetchProcesses()
    fetchServers()

    // 启动自动刷新
    if (autoRefresh) {
      startAutoRefresh()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh])

  const startAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      fetchProcesses(true) // 静默刷新
    }, 5000) // 每5秒刷新一次主页面
  }

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const fetchProcesses = async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true)
    }
    try {
      const response = await fetch('/api/processes')
      if (response.ok) {
        const data = await response.json()
        setProcesses(data)
        setLastUpdateTime(new Date())
        setConnectionError(false)

        // 如果有选中的进程，更新其数据
        if (selectedProcess) {
          const updatedProcess = data.find((p: Process) => p.id === selectedProcess.id)
          if (updatedProcess) {
            setSelectedProcess(updatedProcess)
          }
        }
      } else {
        setConnectionError(true)
      }
    } catch (error) {
      console.error('获取进程列表失败:', error)
      setConnectionError(true)
    } finally {
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers')
      if (response.ok) {
        const data = await response.json()
        setServers(data)

        // 如果当前选中的服务器不存在，切换到本地服务器
        if (!data.find((s: ServerType) => s.id === selectedServerId)) {
          setSelectedServerId('local')
        }
      }
    } catch (error) {
      console.error('获取服务器列表失败:', error)
    }
  }

  const handleManualRefresh = () => {
    fetchProcesses(false)
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    if (!autoRefresh) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }

  const createProcess = async () => {
    if (!newProcessName.trim() || !newProcessCommand.trim() || !selectedServerId) return

    setLoading(true)
    try {
      const response = await fetch('/api/processes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProcessName,
          command: newProcessCommand,
          cwd: newProcessCwd,
          autoRestart: true,
          serverId: selectedServerId,
        }),
      })

      if (response.ok) {
        setNewProcessName('')
        setNewProcessCommand('')
        setNewProcessCwd('/root')
        fetchProcesses()
      }
    } catch (error) {
      console.error('创建进程失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const performAction = async (processId: string, action: string) => {
    try {
      const response = await fetch(`/api/processes/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchProcesses()
      }
    } catch (error) {
      console.error(`执行操作 ${action} 失败:`, error)
    }
  }

  const deleteProcess = async (processId: string) => {
    try {
      const response = await fetch(`/api/processes/${processId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchProcesses()
        setDeleteConfirm({ show: false, processId: '', processName: '' })
      }
    } catch (error) {
      console.error('删除进程失败:', error)
    }
  }

  const confirmDelete = (processId: string, processName: string) => {
    setDeleteConfirm({ show: true, processId, processName })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500'
      case 'stopped': return 'text-gray-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4 text-green-500" />
      case 'stopped': return <Square className="h-4 w-4 text-gray-500" />
      case 'error': return <Server className="h-4 w-4 text-red-500" />
      default: return <Server className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="container mx-auto py-4 md:py-8 px-4">
      {/* 头部区域 - 响应式布局 */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              进程保活管理器
            </h1>
            <div className="text-sm md:text-base text-gray-600 dark:text-gray-300 space-y-1">
              <div>现代化的进程监控和管理系统</div>
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <span>当前管理 {processes.length} 个进程</span>
                <span>•</span>
                <span>{processes.filter(p => p.status === 'running').length} 个正在运行</span>
                {lastUpdateTime && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
                      最后更新: {lastUpdateTime.toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* 控制面板 - 响应式 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 lg:gap-3">
            {/* 连接状态 */}
            <div className="flex items-center gap-1 text-xs md:text-sm order-last sm:order-first">
              {connectionError ? (
                <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
              ) : (
                <Wifi className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
              )}
              <span className={connectionError ? 'text-red-500' : 'text-green-500'}>
                {connectionError ? '离线' : '在线'}
              </span>
            </div>
            
            {/* 控制按钮组 */}
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
              >
                <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">刷新</span>
              </Button>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={toggleAutoRefresh}
                className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
              >
                <Activity className={`h-3 w-3 md:h-4 md:w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                <span className="hidden lg:inline">{autoRefresh ? '自动刷新开' : '自动刷新关'}</span>
                <span className="lg:hidden">自动</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowServerManager(true)}
                className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
              >
                <Server className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">服务器</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigManager(true)}
                className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-3 text-xs md:text-sm"
              >
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">配置</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 添加新进程 - 优化移动端布局 */}
      <Card className="mb-6 md:mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Plus className="h-4 w-4 md:h-5 md:w-5" />
            添加新进程
          </CardTitle>
          <CardDescription className="text-sm">
            创建一个新的进程管理任务
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 服务器选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                目标服务器
              </label>
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger className="h-9 md:h-10">
                  <SelectValue placeholder="选择服务器" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name} ({server.host})
                      {server.status === 'offline' ? ' - 离线' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 进程基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  进程名称
                </label>
                <Input
                  placeholder="例如: Web服务器"
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className="h-9 md:h-10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  工作目录
                </label>
                <Input
                  placeholder="例如: /root/project"
                  value={newProcessCwd}
                  onChange={(e) => setNewProcessCwd(e.target.value)}
                  className="h-9 md:h-10"
                />
              </div>
            </div>
            
            {/* 执行命令 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                执行命令
              </label>
              <Input
                placeholder="例如: python3 app.py --port 8080"
                value={newProcessCommand}
                onChange={(e) => setNewProcessCommand(e.target.value)}
                className="h-9 md:h-10"
              />
            </div>
            
            {/* 创建按钮 */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={createProcess}
                disabled={loading || !newProcessName.trim() || !newProcessCommand.trim()}
                className="w-full sm:w-auto h-9 md:h-10"
              >
                {loading ? '创建中...' : '创建进程'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 进程列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {processes.map((process) => (
          <Card key={process.id} className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-base md:text-lg font-medium truncate">{process.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getStatusIcon(process.status)}
                  <span className={`text-xs md:text-sm font-medium ${getStatusColor(process.status)}`}>
                    {process.status === 'running' ? '运行中' : 
                     process.status === 'stopped' ? '已停止' : '错误'}
                  </span>
                </div>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm break-all">
                {process.command}
              </CardDescription>
              {/* 服务器信息 */}
              {process.serverName && (
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Server className="h-3 w-3" />
                  <span>{process.serverName}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {/* 进程信息 - 响应式网格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div className="truncate">
                  <span className="font-medium">创建:</span> {new Date(process.createdAt).toLocaleDateString()}
                </div>
                {process.lastStarted && (
                  <div className="truncate">
                    <span className="font-medium">启动:</span> {new Date(process.lastStarted).toLocaleDateString()}
                  </div>
                )}
                <div className="truncate">
                  <span className="font-medium">目录:</span> {process.cwd || '/root'}
                </div>
                <div>
                  <span className="font-medium">重启:</span> {process.restartCount}次
                  {process.pid && <span className="ml-2"><span className="font-medium">PID:</span> {process.pid}</span>}
                </div>
              </div>
              
              {/* 操作按钮 - 移动端优化 */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {process.status !== 'running' ? (
                  <Button
                    size="sm"
                    onClick={() => performAction(process.id, 'start')}
                    className="flex items-center justify-center gap-1 h-8 text-xs"
                  >
                    <Play className="h-3 w-3" />
                    <span>启动</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => performAction(process.id, 'stop')}
                    className="flex items-center justify-center gap-1 h-8 text-xs"
                  >
                    <Square className="h-3 w-3" />
                    <span>停止</span>
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => performAction(process.id, 'restart')}
                  className="flex items-center justify-center gap-1 h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>重启</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProcess(process)}
                  className="flex items-center justify-center gap-1 h-8 text-xs col-span-1"
                >
                  <FileText className="h-3 w-3" />
                  <span>日志</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => confirmDelete(process.id, process.name)}
                  className="flex items-center justify-center gap-1 h-8 text-xs col-span-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>删除</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {processes.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无进程
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              添加你的第一个进程来开始管理
            </p>
          </CardContent>
        </Card>
      )}
      {/* 日志模态框 */}
      {selectedProcess && (
        <ProcessLogs
          process={selectedProcess}
          onClose={() => setSelectedProcess(null)}
          onProcessUpdate={(updatedProcess) => {
            setSelectedProcess(updatedProcess)
            // 同时更新进程列表中对应的进程
            setProcesses(prevProcesses => 
              prevProcesses.map(p => 
                p.id === updatedProcess.id ? updatedProcess : p
              )
            )
          }}
        />
      )}

      {/* 配置管理模态框 */}
      {showConfigManager && (
        <ConfigManager
          onClose={() => setShowConfigManager(false)}
          onImportSuccess={fetchProcesses}
        />
      )}

      {/* 服务器管理模态框 */}
      {showServerManager && (
        <ServerManager
          onClose={() => setShowServerManager(false)}
          onServerChange={() => {
            fetchServers()
            fetchProcesses()
          }}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="确认删除进程"
        description={`确定要删除进程 "${deleteConfirm.processName}" 吗？此操作不可逆转。`}
        onConfirm={() => deleteProcess(deleteConfirm.processId)}
        onCancel={() => setDeleteConfirm({ show: false, processId: '', processName: '' })}
        confirmText="删除"
        cancelText="取消"
        isDestructive={true}
      />
    </div>
  )
}
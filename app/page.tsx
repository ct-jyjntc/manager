'use client'

import { useState, useEffect } from 'react'
import { Plus, Play, Square, RotateCcw, Trash2, Activity, Server, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProcessLogs } from '@/components/process-logs'
import { Process } from '@/types/process'

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [newProcessName, setNewProcessName] = useState('')
  const [newProcessCommand, setNewProcessCommand] = useState('')
  const [newProcessCwd, setNewProcessCwd] = useState('/root')
  const [loading, setLoading] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)

  useEffect(() => {
    fetchProcesses()
  }, [])

  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/processes')
      if (response.ok) {
        const data = await response.json()
        setProcesses(data)
      }
    } catch (error) {
      console.error('获取进程列表失败:', error)
    }
  }

  const createProcess = async () => {
    if (!newProcessName.trim() || !newProcessCommand.trim()) return

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
      }
    } catch (error) {
      console.error('删除进程失败:', error)
    }
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          进程保活管理器
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          现代化的进程监控和管理系统
        </p>
      </div>

      {/* 添加新进程 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            添加新进程
          </CardTitle>
          <CardDescription>
            创建一个新的进程管理任务
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="进程名称"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
            />
            <Input
              placeholder="执行命令 (例如: python3 /root/app.py)"
              value={newProcessCommand}
              onChange={(e) => setNewProcessCommand(e.target.value)}
              className="md:col-span-1 lg:col-span-2"
            />
            <Input
              placeholder="工作目录 (例如: /root)"
              value={newProcessCwd}
              onChange={(e) => setNewProcessCwd(e.target.value)}
            />
          </div>
          <Button
            onClick={createProcess}
            className="mt-4"
            disabled={loading || !newProcessName.trim() || !newProcessCommand.trim()}
          >
            {loading ? '创建中...' : '创建进程'}
          </Button>
        </CardContent>
      </Card>

      {/* 进程列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {processes.map((process) => (
          <Card key={process.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{process.name}</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(process.status)}
                  <span className={`text-sm font-medium ${getStatusColor(process.status)}`}>
                    {process.status === 'running' ? '运行中' : 
                     process.status === 'stopped' ? '已停止' : '错误'}
                  </span>
                </div>
              </CardTitle>
              <CardDescription className="truncate">
                {process.command}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                <div>创建时间: {new Date(process.createdAt).toLocaleString()}</div>
                {process.lastStarted && (
                  <div>最后启动: {new Date(process.lastStarted).toLocaleString()}</div>
                )}
                <div>工作目录: {process.cwd || '/root'}</div>
                <div>重启次数: {process.restartCount}</div>
                {process.pid && <div>进程ID: {process.pid}</div>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {process.status !== 'running' ? (
                  <Button
                    size="sm"
                    onClick={() => performAction(process.id, 'start')}
                    className="flex items-center gap-1"
                  >
                    <Play className="h-3 w-3" />
                    启动
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => performAction(process.id, 'stop')}
                    className="flex items-center gap-1"
                  >
                    <Square className="h-3 w-3" />
                    停止
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => performAction(process.id, 'restart')}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  重启
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedProcess(process)}
                  className="flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  日志
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteProcess(process.id)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  删除
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
        />
      )}
    </div>
  )
}
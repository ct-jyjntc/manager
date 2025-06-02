'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Server, Wifi, WifiOff, Settings, Trash2, TestTube, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Server as ServerType, CreateServerRequest, ServerConnectionTest } from '@/types/process'

interface ServerManagerProps {
  onClose: () => void
  onServerChange?: () => void
}

export function ServerManager({ onClose, onServerChange }: ServerManagerProps) {
  const [servers, setServers] = useState<ServerType[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingServer, setEditingServer] = useState<ServerType | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serverId: string; serverName: string }>({
    show: false,
    serverId: '',
    serverName: ''
  })
  const [testResults, setTestResults] = useState<Map<string, ServerConnectionTest>>(new Map())

  // 表单状态
  const [formData, setFormData] = useState<CreateServerRequest>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    description: ''
  })

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers')
      if (response.ok) {
        const data = await response.json()
        setServers(data)
      }
    } catch (error) {
      console.error('获取服务器列表失败:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.host || !formData.username) return

    setLoading(true)
    try {
      const url = editingServer ? `/api/servers/${editingServer.id}` : '/api/servers'
      const method = editingServer ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        resetForm()
        fetchServers()
        onServerChange?.()
      }
    } catch (error) {
      console.error('保存服务器失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      description: ''
    })
    setShowAddForm(false)
    setEditingServer(null)
  }

  const handleEdit = (server: ServerType) => {
    if (server.isLocal) return // 不允许编辑本地服务器
    
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      password: '',
      description: server.description || ''
    })
    setEditingServer(server)
    setShowAddForm(true)
  }

  const handleDelete = async (serverId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchServers()
        onServerChange?.()
        setDeleteConfirm({ show: false, serverId: '', serverName: '' })
      }
    } catch (error) {
      console.error('删除服务器失败:', error)
    }
  }

  const testConnection = async (serverId: string) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/test`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        setTestResults(prev => new Map(prev.set(serverId, result)))
      }
    } catch (error) {
      console.error('测试连接失败:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />
      case 'offline': return <WifiOff className="h-4 w-4 text-gray-500" />
      case 'connecting': return <Settings className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'error': return <WifiOff className="h-4 w-4 text-red-500" />
      default: return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'offline': return 'text-gray-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                服务器管理
              </CardTitle>
              <CardDescription>
                管理多个服务器连接，支持SSH远程管理
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                添加服务器
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <div className="h-full flex gap-6">
            {/* 服务器列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {servers.map((server) => (
                  <Card key={server.id} className="relative">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{server.name}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(server.status)}
                          <span className={`text-sm ${getStatusColor(server.status)}`}>
                            {server.status === 'online' ? '在线' : 
                             server.status === 'offline' ? '离线' : 
                             server.status === 'connecting' ? '连接中' : '错误'}
                          </span>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        {server.username}@{server.host}:{server.port}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {server.description && (
                          <div>{server.description}</div>
                        )}
                        <div>创建时间: {new Date(server.createdAt).toLocaleDateString()}</div>
                        {server.lastConnected && (
                          <div>最后连接: {new Date(server.lastConnected).toLocaleString()}</div>
                        )}
                      </div>

                      {/* 测试结果 */}
                      {testResults.has(server.id) && (
                        <div className={`text-xs p-2 rounded mb-3 ${
                          testResults.get(server.id)?.success 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {testResults.get(server.id)?.message}
                          {testResults.get(server.id)?.latency && 
                            ` (延迟: ${testResults.get(server.id)?.latency}ms)`
                          }
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(server.id)}
                          className="flex items-center gap-1"
                        >
                          <TestTube className="h-3 w-3" />
                          测试连接
                        </Button>
                        
                        {!server.isLocal && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(server)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ 
                                show: true, 
                                serverId: server.id, 
                                serverName: server.name 
                              })}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              删除
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 添加/编辑表单 */}
            {showAddForm && (
              <div className="w-96 flex-shrink-0">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingServer ? '编辑服务器' : '添加新服务器'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">服务器名称</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="例如: 生产服务器"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">主机地址</label>
                        <Input
                          value={formData.host}
                          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                          placeholder="例如: 192.168.1.100"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">端口</label>
                        <Input
                          type="number"
                          value={formData.port}
                          onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                          placeholder="22"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">用户名</label>
                        <Input
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="例如: root"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">密码</label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="SSH密码"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">描述</label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="服务器描述"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1"
                        >
                          {loading ? '保存中...' : (editingServer ? '更新' : '添加')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetForm}
                        >
                          取消
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="确认删除服务器"
        description={`确定要删除服务器 "${deleteConfirm.serverName}" 吗？此操作不可逆转。`}
        onConfirm={() => handleDelete(deleteConfirm.serverId)}
        onCancel={() => setDeleteConfirm({ show: false, serverId: '', serverName: '' })}
        confirmText="删除"
        cancelText="取消"
        isDestructive={true}
      />
    </div>
  )
}

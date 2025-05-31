'use client'

import { useState } from 'react'
import { Download, Upload, X, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ConfigManagerProps {
  onClose: () => void
  onImportSuccess: () => void
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export function ConfigManager({ onClose, onImportSuccess }: ConfigManagerProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const exportConfig = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/processes/export')
      if (!response.ok) {
        throw new Error('导出失败')
      }

      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `process-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出配置失败:', error)
      alert('导出配置失败')
    } finally {
      setExporting(false)
    }
  }

  const importConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 重置文件输入
    event.target.value = ''

    // 先验证文件格式
    try {
      const text = await file.text()
      const config = JSON.parse(text)
      
      if (!config.processes || !Array.isArray(config.processes)) {
        alert('无效的配置文件格式')
        return
      }

      // 显示确认对话框
      setPendingFile(file)
      setShowConfirmDialog(true)
    } catch (error) {
      alert('配置文件格式错误，请确保是有效的 JSON 文件')
    }
  }

  const loadExampleConfig = async () => {
    try {
      const response = await fetch('/example-config.json')
      if (!response.ok) {
        throw new Error('无法加载示例配置')
      }
      
      const config = await response.json()
      setPendingFile(new File([JSON.stringify(config)], 'example-config.json', { type: 'application/json' }))
      setShowConfirmDialog(true)
    } catch (error) {
      console.error('加载示例配置失败:', error)
      alert('加载示例配置失败')
    }
  }

  const confirmImport = async () => {
    if (!pendingFile) return

    setImporting(true)
    setImportResult(null)
    setShowConfirmDialog(false)

    try {
      const text = await pendingFile.text()
      const config = JSON.parse(text)

      const response = await fetch('/api/processes/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('导入失败')
      }

      const result = await response.json()
      setImportResult(result.results)
      
      if (result.results.imported > 0) {
        onImportSuccess()
      }
    } catch (error) {
      console.error('导入配置失败:', error)
      alert('导入配置失败: 请确保文件格式正确')
    } finally {
      setImporting(false)
      setPendingFile(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                配置管理
              </CardTitle>
              <CardDescription>
                导入和导出进程配置
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              关闭
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 导出配置 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">导出配置</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              将当前所有进程配置导出为 JSON 文件，可用于备份或迁移到其他系统。
            </p>
            <Button
              onClick={exportConfig}
              disabled={exporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? '导出中...' : '导出配置文件'}
            </Button>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 导入配置 */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">导入配置</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              从 JSON 文件导入进程配置。同名进程将被跳过以避免冲突。
            </p>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                  disabled={importing}
                />
                <Button
                  disabled={importing}
                  className="flex items-center gap-2"
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4" />
                    {importing ? '导入中...' : '选择配置文件'}
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                onClick={loadExampleConfig}
                disabled={importing}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                试试示例配置
              </Button>
            </div>
          </div>

          {/* 导入结果 */}
          {importResult && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">导入结果</h3>
              <div className="space-y-2">
                {importResult.imported > 0 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>成功导入 {importResult.imported} 个进程</span>
                  </div>
                )}
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>跳过 {importResult.skipped} 个同名进程</span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span>发生 {importResult.errors.length} 个错误:</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 ml-6">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">使用说明</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 导出的配置文件包含进程名称、命令、工作目录和自动重启设置</li>
              <li>• 不包含运行状态、日志和 PID 等运行时数据</li>
              <li>• 导入时，同名进程将被自动跳过，不会覆盖现有配置</li>
              <li>• 建议定期导出配置文件作为备份</li>
            </ul>
          </div>
        </CardContent>

        {/* 确认对话框 */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title="确认导入配置"
          description={`确定要导入配置文件 "${pendingFile?.name}" 吗？导入后会添加新的进程配置，同名进程将被跳过。`}
          onConfirm={confirmImport}
          onCancel={() => {
            setShowConfirmDialog(false)
            setPendingFile(null)
          }}
          confirmText="导入"
          cancelText="取消"
        />
      </Card>
    </div>
  )
}

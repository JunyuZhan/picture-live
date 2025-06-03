'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadFile {
  id: string
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface UploadAreaProps {
  onUpload: (files: File[]) => Promise<void>
  sessionId?: string
  maxFiles?: number
  maxSize?: number // bytes
  acceptedTypes?: string[]
  disabled?: boolean
  className?: string
}

export function UploadArea({
  onUpload,
  sessionId,
  maxFiles = 20,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  disabled = false,
  className
}: UploadAreaProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createUploadFile = (file: File): UploadFile => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }
  }

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`
    }
    if (file.size > maxSize) {
      return `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(1)}MB > ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    }
    return null
  }

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // 处理被拒绝的文件
    rejectedFiles.forEach(({ file, errors }) => {
      console.error(`文件 ${file.name} 被拒绝:`, errors)
    })

    // 验证并添加接受的文件
    const validFiles: UploadFile[] = []
    const invalidFiles: string[] = []

    acceptedFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        invalidFiles.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(createUploadFile(file))
      }
    })

    if (invalidFiles.length > 0) {
      alert(`以下文件无法上传:\n${invalidFiles.join('\n')}`)
    }

    // 检查文件数量限制
    const totalFiles = uploadFiles.length + validFiles.length
    if (totalFiles > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`)
      return
    }

    setUploadFiles(prev => [...prev, ...validFiles])
  }, [uploadFiles.length, maxFiles, maxSize, acceptedTypes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': acceptedTypes.map(type => type.replace('image/', '.'))
    },
    maxFiles,
    maxSize,
    disabled: disabled || isUploading
  })

  const removeFile = (id: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const clearAll = () => {
    uploadFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setUploadFiles([])
  }

  const handleUpload = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      // 更新状态为上传中
      setUploadFiles(prev => prev.map(file => 
        file.status === 'pending' 
          ? { ...file, status: 'uploading' as const }
          : file
      ))

      // 真实文件上传
      const formData = new FormData()
      pendingFiles.forEach(uploadFile => {
        formData.append('photos', uploadFile.file)
      })
      
      if (sessionId) {
        formData.append('sessionId', sessionId)
      }
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(file => 
          file.status === 'uploading'
            ? { ...file, progress: Math.min(file.progress + Math.random() * 20, 90) }
            : file
        ))
      }, 500)

      // 执行实际上传到API
      try {
        const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/photos`, {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error('Upload failed')
        }
        
        const result = await response.json()
        
        // 如果有onUpload回调，也调用它
        if (onUpload) {
          await onUpload(pendingFiles.map(f => f.file))
        }
      } catch (uploadError) {
        // 如果API上传失败，尝试使用回调函数
        if (onUpload) {
          await onUpload(pendingFiles.map(f => f.file))
        } else {
          throw uploadError
        }
      }

      // 清除进度更新
      clearInterval(progressInterval)

      // 更新为成功状态
      setUploadFiles(prev => prev.map(file => 
        file.status === 'uploading'
          ? { ...file, status: 'success' as const, progress: 100 }
          : file
      ))

      // 2秒后清除成功的文件
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.status !== 'success'))
      }, 2000)

    } catch (error) {
      // 更新为错误状态
      setUploadFiles(prev => prev.map(file => 
        file.status === 'uploading'
          ? { 
              ...file, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : '上传失败'
            }
          : file
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const retryUpload = (id: string) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === id
        ? { ...file, status: 'pending', progress: 0, error: undefined }
        : file
    ))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length
  const uploadingCount = uploadFiles.filter(f => f.status === 'uploading').length
  const successCount = uploadFiles.filter(f => f.status === 'success').length
  const errorCount = uploadFiles.filter(f => f.status === 'error').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* 拖拽上传区域 */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              )}>
                <Upload className="w-6 h-6" />
              </div>
              
              <div>
                <p className="text-lg font-medium mb-1">
                  {isDragActive ? '释放文件开始上传' : '拖拽文件到这里或点击选择'}
                </p>
                <p className="text-sm text-gray-500">
                  支持 JPEG、PNG、WebP、HEIC 格式，单个文件最大 {(maxSize / 1024 / 1024).toFixed(0)}MB
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  最多可上传 {maxFiles} 个文件
                </p>
              </div>
              
              <Button 
                variant="outline" 
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                选择文件
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">待上传文件 ({uploadFiles.length})</h3>
                {pendingCount > 0 && (
                  <Badge variant="outline">{pendingCount} 待上传</Badge>
                )}
                {uploadingCount > 0 && (
                  <Badge variant="default">{uploadingCount} 上传中</Badge>
                )}
                {successCount > 0 && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {successCount} 已完成
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">{errorCount} 失败</Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                {pendingCount > 0 && (
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        开始上传
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={clearAll}
                  disabled={isUploading}
                  size="sm"
                >
                  清空列表
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {uploadFiles.map(uploadFile => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {/* 预览图 */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={uploadFile.preview} 
                      alt={uploadFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <Badge 
                        variant={uploadFile.status === 'success' ? 'default' : 
                                uploadFile.status === 'error' ? 'destructive' : 'outline'}
                        className={uploadFile.status === 'success' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {uploadFile.status === 'pending' && '待上传'}
                        {uploadFile.status === 'uploading' && '上传中'}
                        {uploadFile.status === 'success' && '已完成'}
                        {uploadFile.status === 'error' && '失败'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    
                    {/* 进度条 */}
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-1" />
                    )}
                    
                    {/* 错误信息 */}
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>
                  
                  {/* 状态图标和操作 */}
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {uploadFile.status === 'error' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => retryUpload(uploadFile.id)}
                        >
                          重试
                        </Button>
                      </>
                    )}
                    {uploadFile.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploadFile.status === 'uploading'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
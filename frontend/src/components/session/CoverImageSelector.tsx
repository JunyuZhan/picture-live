'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Image, Camera, Upload, Palette, Link, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CoverImageSelectorProps {
  value?: string
  sessionPhotos?: Array<{
    id: string
    thumbnailUrl: string
    originalUrl: string
    filename: string
  }>
  sessionType?: 'wedding' | 'event' | 'portrait' | 'commercial' | 'travel' | 'other'
  onChange: (imageUrl: string, source: 'url' | 'photo' | 'template' | 'upload') => void
  className?: string
}

// 封面模板数据 - 根据相册类型
const COVER_TEMPLATES = {
  wedding: [
    { id: 'wedding-1', url: '/templates/wedding-1.jpg', name: '婚礼经典' },
    { id: 'wedding-2', url: '/templates/wedding-2.jpg', name: '浪漫花园' },
    { id: 'wedding-3', url: '/templates/wedding-3.jpg', name: '简约优雅' },
  ],
  travel: [
    { id: 'travel-1', url: '/templates/travel-1.jpg', name: '山川美景' },
    { id: 'travel-2', url: '/templates/travel-2.jpg', name: '海边风情' },
    { id: 'travel-3', url: '/templates/travel-3.jpg', name: '城市夜色' },
  ],
  portrait: [
    { id: 'portrait-1', url: '/templates/portrait-1.jpg', name: '人像简约' },
    { id: 'portrait-2', url: '/templates/portrait-2.jpg', name: '艺术黑白' },
    { id: 'portrait-3', url: '/templates/portrait-3.jpg', name: '温暖色调' },
  ],
  event: [
    { id: 'event-1', url: '/templates/event-1.jpg', name: '活动庆典' },
    { id: 'event-2', url: '/templates/event-2.jpg', name: '商务会议' },
    { id: 'event-3', url: '/templates/event-3.jpg', name: '生日聚会' },
  ],
  commercial: [
    { id: 'commercial-1', url: '/templates/commercial-1.jpg', name: '商业简洁' },
    { id: 'commercial-2', url: '/templates/commercial-2.jpg', name: '产品展示' },
    { id: 'commercial-3', url: '/templates/commercial-3.jpg', name: '品牌形象' },
  ],
  other: [
    { id: 'default-1', url: '/templates/default-1.jpg', name: '通用模板' },
    { id: 'default-2', url: '/templates/default-2.jpg', name: '简约风格' },
    { id: 'default-3', url: '/templates/default-3.jpg', name: '创意设计' },
  ]
}

export function CoverImageSelector({
  value,
  sessionPhotos = [],
  sessionType = 'other',
  onChange,
  className
}: CoverImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('photo')
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentTemplates = COVER_TEMPLATES[sessionType] || COVER_TEMPLATES.other

  const handlePhotoSelect = useCallback((photo: any) => {
    onChange(photo.originalUrl, 'photo')
    setIsOpen(false)
  }, [onChange])

  const handleTemplateSelect = useCallback((template: any) => {
    onChange(template.url, 'template')
    setIsOpen(false)
  }, [onChange])

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim(), 'url')
      setUrlInput('')
      setIsOpen(false)
    }
  }, [urlInput, onChange])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 这里应该上传文件到服务器，现在模拟返回URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onChange(result, 'upload')
        setIsOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }, [onChange])

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-gray-700">
        相册封面
      </label>
      
      {/* 当前封面预览 */}
      <div 
        className="relative w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="封面预览"
              className="w-full h-full object-cover"
            />
            {/* 遮罩和编辑提示 */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center transition-all">
              <div className="opacity-0 hover:opacity-100 bg-white rounded-full p-2 shadow-lg transition-opacity">
                <Image className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChange('', 'url')
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Image className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">点击选择封面图片</p>
            <p className="text-xs text-gray-400 mt-1">支持从相册选择、模板或上传</p>
          </div>
        )}
      </div>

      {/* 选择对话框 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>选择相册封面</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                从相册选择
                {sessionPhotos.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {sessionPhotos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="template" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                封面模板
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                上传图片
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                网络图片
              </TabsTrigger>
            </TabsList>

            {/* 从相册选择 */}
            <TabsContent value="photo" className="mt-4 max-h-96 overflow-y-auto">
              {sessionPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Image className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">相册中暂无照片</p>
                  <p className="text-sm">请先上传照片后再选择封面</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {sessionPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square cursor-pointer group"
                      onClick={() => handlePhotoSelect(photo)}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        className="w-full h-full object-cover rounded-lg border hover:border-blue-500 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all">
                        <div className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2 shadow-lg transition-opacity">
                          <Check className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 封面模板 */}
            <TabsContent value="template" className="mt-4 max-h-96 overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  为您推荐适合 
                  <Badge variant="outline" className="mx-1">
                    {sessionType === 'wedding' ? '婚礼' : 
                     sessionType === 'travel' ? '旅拍' :
                     sessionType === 'portrait' ? '人像' :
                     sessionType === 'event' ? '活动' :
                     sessionType === 'commercial' ? '商业' : '其他'}
                  </Badge> 
                  类型的封面模板
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="relative aspect-video cursor-pointer group"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <img
                      src={template.url}
                      alt={template.name}
                      className="w-full h-full object-cover rounded-lg border hover:border-blue-500 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all">
                      <div className="opacity-0 group-hover:opacity-100 bg-white rounded px-3 py-1 shadow-lg transition-opacity">
                        <p className="text-sm font-medium text-gray-800">{template.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 上传图片 */}
            <TabsContent value="upload" className="mt-4">
              <div className="flex flex-col items-center justify-center py-12">
                <div 
                  className="w-full max-w-md h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-600 mb-2">点击上传封面图片</p>
                  <p className="text-sm text-gray-500 text-center">
                    支持 JPG、PNG 格式<br/>
                    建议尺寸：1920×1080 像素
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </TabsContent>

            {/* 网络图片 */}
            <TabsContent value="url" className="mt-4">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-full max-w-md space-y-4">
                  <h3 className="text-lg font-medium text-center">使用网络图片链接</h3>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="请输入图片URL地址"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                      className="w-full"
                    >
                      使用此图片
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    请确保图片链接可以公开访问
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
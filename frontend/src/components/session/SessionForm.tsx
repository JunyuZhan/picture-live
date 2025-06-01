'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Users, 
  Clock, 
  Shield, 
  Eye, 
  EyeOff, 
  Plus,
  Settings,
  Calendar,
  MapPin,
  Palette,
  Download,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/components/providers/session-provider'
import { toast } from '@/hooks/use-toast'

// 表单验证模式
const sessionFormSchema = z.object({
  title: z.string().min(1, '请输入会话标题').max(100, '标题不能超过100个字符'),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  location: z.string().max(100, '地点不能超过100个字符').optional(),
  scheduledAt: z.string().optional(),
  maxParticipants: z.number().min(1, '最少1人').max(1000, '最多1000人').optional(),
  isPublic: z.boolean().default(true),
  allowGuestUpload: z.boolean().default(true),
  allowGuestDownload: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  watermarkEnabled: z.boolean().default(false),
  watermarkText: z.string().max(50, '水印文字不能超过50个字符').optional(),
  autoDeleteAfter: z.number().min(1).max(365).optional(), // 天数
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  coverColor: z.string().optional()
})

type SessionFormData = z.infer<typeof sessionFormSchema>

interface SessionFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<SessionFormData>
  onSubmit: (data: SessionFormData) => Promise<void>
  onCancel?: () => void
  trigger?: React.ReactNode
  className?: string
}

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6B7280'  // gray
]

const THEME_OPTIONS = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'auto', label: '自动', icon: '🔄' }
]

export function SessionForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  trigger,
  className
}: SessionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const { createSession, updateSession } = useSession()
  
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      scheduledAt: '',
      maxParticipants: 50,
      isPublic: true,
      allowGuestUpload: true,
      allowGuestDownload: false,
      requireApproval: false,
      watermarkEnabled: false,
      watermarkText: '',
      autoDeleteAfter: 30,
      theme: 'light',
      coverColor: PRESET_COLORS[0],
      ...initialData
    }
  })

  const handleSubmit = async (data: SessionFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      setIsOpen(false)
      form.reset()
      toast({
        title: mode === 'create' ? "会话创建成功" : "会话更新成功",
        description: mode === 'create' ? "新的拍摄会话已创建" : "会话设置已更新"
      })
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    form.reset()
    onCancel?.()
  }

  const formatDateTime = (date: Date) => {
    return date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
  }

  const FormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">基本信息</h3>
          </div>
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会话标题 *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="例如：婚礼现场拍摄、生日派对记录"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会话描述</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="简单描述这次拍摄的主题和要求..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  让参与者了解拍摄的背景和目的
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>拍摄地点</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        className="pl-10"
                        placeholder="例如：北京朝阳公园"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>计划时间</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        type="datetime-local"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 参与设置 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium">参与设置</h3>
          </div>
          
          <FormField
            control={form.control}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>最大参与人数</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min={1}
                    max={1000}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormDescription>
                  设置可以加入此会话的最大人数
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      {field.value ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      公开会话
                    </FormLabel>
                    <FormDescription>
                      其他用户可以发现并加入
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allowGuestUpload"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">允许访客上传</FormLabel>
                    <FormDescription>
                      访客可以上传照片
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 高级设置 */}
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 p-0 h-auto"
          >
            <Settings className="w-4 h-4" />
            高级设置
            <span className={cn(
              'transition-transform',
              showAdvanced ? 'rotate-180' : ''
            )}>
              ▼
            </span>
          </Button>
          
          {showAdvanced && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allowGuestDownload"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          允许访客下载
                        </FormLabel>
                        <FormDescription>
                          访客可以下载照片
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="requireApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          需要审核
                        </FormLabel>
                        <FormDescription>
                          上传的照片需要审核
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* 水印设置 */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="watermarkEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">启用水印</FormLabel>
                        <FormDescription>
                          为照片添加水印保护
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {form.watch('watermarkEnabled') && (
                  <FormField
                    control={form.control}
                    name="watermarkText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>水印文字</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="例如：© 2024 摄影师姓名"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          将显示在照片右下角
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              {/* 自动删除 */}
              <FormField
                control={form.control}
                name="autoDeleteAfter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>自动删除时间（天）</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={1}
                        max={365}
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      会话结束后多少天自动删除照片（留空表示不自动删除）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 主题设置 */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>界面主题</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2">
                          {THEME_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={cn(
                                'flex items-center gap-2 p-3 rounded-lg border transition-colors',
                                field.value === option.value
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              )}
                              onClick={() => field.onChange(option.value)}
                            >
                              <span>{option.icon}</span>
                              <span className="text-sm">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="coverColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        封面颜色
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <div className="grid grid-cols-5 gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  'w-8 h-8 rounded-full border-2 transition-all',
                                  field.value === color
                                    ? 'border-gray-400 scale-110'
                                    : 'border-gray-200 hover:border-gray-300'
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                          <Input
                            type="color"
                            value={field.value || PRESET_COLORS[0]}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 h-8 p-0 border-0"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        选择会话封面的主色调
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'create' ? '创建中...' : '保存中...'}
              </div>
            ) : (
              mode === 'create' ? '创建会话' : '保存更改'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {mode === 'create' ? '创建新会话' : '编辑会话'}
            </DialogTitle>
          </DialogHeader>
          <FormContent />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {mode === 'create' ? '创建新会话' : '编辑会话'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormContent />
      </CardContent>
    </Card>
  )
}

// 快速创建会话的简化组件
export function QuickSessionForm({ onSubmit, className }: {
  onSubmit: (data: { title: string; description?: string }) => Promise<void>
  className?: string
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || undefined })
      setTitle('')
      setDescription('')
      toast({
        title: "会话创建成功",
        description: "新的拍摄会话已创建"
      })
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请重试",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          快速创建会话
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quick-title">会话标题 *</Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：婚礼现场拍摄"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quick-description">简单描述</Label>
            <textarea
              id="quick-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这次拍摄..."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <Button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                创建中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                创建会话
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
'use client'

import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Users, Camera, Share2, Settings, Trash2, Play, Pause, Square } from 'lucide-react'
import type { Session } from '@/types/session'

interface SessionCardProps {
  session: Session
  onEdit?: (session: Session) => void
  onDelete?: (sessionId: string) => void
  onShare?: (session: Session) => void
  onStart?: (sessionId: string) => void
  onPause?: (sessionId: string) => void
  onEnd?: (sessionId: string) => void
  showActions?: boolean
}

export function SessionCard({
  session,
  onEdit,
  onDelete,
  onShare,
  onStart,
  onPause,
  onEnd,
  showActions = true
}: SessionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中'
      case 'paused':
        return '已暂停'
      case 'ended':
        return '已结束'
      case 'draft':
        return '草稿'
      default:
        return '未知'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-3 h-3" />
      case 'paused':
        return <Pause className="w-3 h-3" />
      case 'ended':
        return <Square className="w-3 h-3" />
      default:
        return null
    }
  }

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    switch (action) {
      case 'edit':
        onEdit?.(session)
        break
      case 'delete':
        onDelete?.(session.id)
        break
      case 'share':
        onShare?.(session)
        break
      case 'start':
        onStart?.(session.id)
        break
      case 'pause':
        onPause?.(session.id)
        break
      case 'end':
        onEnd?.(session.id)
        break
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(session.status)} flex items-center gap-1`}
              >
                {getStatusIcon(session.status)}
                {getStatusText(session.status)}
              </Badge>
              {session.isPrivate && (
                <Badge variant="secondary" className="text-xs">
                  私密
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-semibold truncate">
              <Link 
                href={`/session/${session.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {session.title}
              </Link>
            </CardTitle>
            {session.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {session.description}
              </CardDescription>
            )}
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleAction('share', e)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleAction('edit', e)}>
                  <Settings className="w-4 h-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {session.status === 'draft' && (
                  <DropdownMenuItem onClick={(e) => handleAction('start', e)}>
                    <Play className="w-4 h-4 mr-2" />
                    开始会话
                  </DropdownMenuItem>
                )}
                {session.status === 'active' && (
                  <DropdownMenuItem onClick={(e) => handleAction('pause', e)}>
                    <Pause className="w-4 h-4 mr-2" />
                    暂停会话
                  </DropdownMenuItem>
                )}
                {session.status === 'paused' && (
                  <DropdownMenuItem onClick={(e) => handleAction('start', e)}>
                    <Play className="w-4 h-4 mr-2" />
                    恢复会话
                  </DropdownMenuItem>
                )}
                {(session.status === 'active' || session.status === 'paused') && (
                  <DropdownMenuItem onClick={(e) => handleAction('end', e)}>
                    <Square className="w-4 h-4 mr-2" />
                    结束会话
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => handleAction('delete', e)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              <span>{session.photoCount || 0} 张照片</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{session.viewCount || 0} 次查看</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(session.createdAt), {
              addSuffix: true,
              locale: zhCN
            })}
          </div>
        </div>
        
        {session.accessCode && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <span className="text-gray-600">访问码：</span>
            <span className="font-mono font-medium">{session.accessCode}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
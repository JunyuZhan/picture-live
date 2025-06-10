'use client'

import React, { useState } from 'react'
import { SessionCard } from './SessionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Filter, Plus, Grid, List } from 'lucide-react'
import type { Session } from '@/types/api'

interface SessionListProps {
  sessions: Session[]
  loading?: boolean
  onCreateSession?: () => void
  onEditSession?: (session: Session) => void
  onDeleteSession?: (sessionId: string) => void
  onShareSession?: (session: Session) => void
  onStartSession?: (sessionId: string) => void
  onPauseSession?: (sessionId: string) => void
  onEndSession?: (sessionId: string) => void
  showCreateButton?: boolean
}

type ViewMode = 'grid' | 'list'
type FilterStatus = 'all' | 'live' | 'paused' | 'ended' | 'draft'
type SortBy = 'created' | 'updated' | 'name' | 'photos'

export function SessionList({
  sessions,
  loading = false,
  onCreateSession,
  onEditSession,
  onDeleteSession,
  onShareSession,
  onStartSession,
  onPauseSession,
  onEndSession,
  showCreateButton = true
}: SessionListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortBy>('created')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // 过滤和搜索逻辑
  const filteredSessions = sessions.filter(session => {
    // 搜索过滤
    const matchesSearch = searchQuery === '' || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // 状态过滤
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  // 排序逻辑
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'photos':
        return (b.stats.totalPhotos || 0) - (a.stats.totalPhotos || 0)
      case 'updated':
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      case 'created':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const getStatusCount = (status: FilterStatus) => {
    if (status === 'all') return sessions.length
    return sessions.filter(s => s.status === status).length
  }

  const getStatusText = (status: FilterStatus) => {
    switch (status) {
      case 'all': return '全部'
      case 'live': return '进行中'
      case 'paused': return '已暂停'
      case 'ended': return '已结束'
      case 'draft': return '草稿'
      default: return '全部'
    }
  }

  const getSortText = (sort: SortBy) => {
    switch (sort) {
      case 'created': return '创建时间'
      case 'updated': return '更新时间'
      case 'name': return '名称'
      case 'photos': return '照片数量'
      default: return '创建时间'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索相册..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 状态过滤 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {getStatusText(filterStatus)}
                {getStatusCount(filterStatus) > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getStatusCount(filterStatus)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(['all', 'live', 'paused', 'ended', 'draft'] as FilterStatus[]).map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={filterStatus === status ? 'bg-blue-50' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{getStatusText(status)}</span>
                    <Badge variant="secondary" className="ml-2">
                      {getStatusCount(status)}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 排序 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                排序: {getSortText(sortBy)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(['created', 'updated', 'name', 'photos'] as SortBy[]).map(sort => (
                <DropdownMenuItem
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={sortBy === sort ? 'bg-blue-50' : ''}
                >
                  {getSortText(sort)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 视图模式 */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* 创建按钮 */}
          {showCreateButton && (
            <Button onClick={onCreateSession}>
              <Plus className="w-4 h-4 mr-2" />
              创建相册
            </Button>
          )}
        </div>
      </div>

      {/* 相册列表 */}
      {sortedSessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' ? (
              <div>
                <p className="text-lg font-medium mb-2">未找到匹配的相册</p>
                <p>尝试调整搜索条件或过滤器</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">还没有相册</p>
                <p>创建您的第一个拍摄相册开始使用</p>
              </div>
            )}
          </div>
          {showCreateButton && (!searchQuery && filterStatus === 'all') && (
            <Button onClick={onCreateSession}>
              <Plus className="w-4 h-4 mr-2" />
              创建相册
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-4'
        }>
          {sortedSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={onEditSession}
              onDelete={onDeleteSession}
              onShare={onShareSession}
              onStart={onStartSession}
              onPause={onPauseSession}
              onEnd={onEndSession}
            />
          ))}
        </div>
      )}

      {/* 结果统计 */}
      {sortedSessions.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          显示 {sortedSessions.length} 个相册
          {searchQuery && ` · 搜索 "${searchQuery}"`}
          {filterStatus !== 'all' && ` · 筛选 "${getStatusText(filterStatus)}"`}
        </div>
      )}
    </div>
  )
}
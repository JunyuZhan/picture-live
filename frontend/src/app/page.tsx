'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Camera,
  Users,
  Zap,
  Shield,
  Download,
  Heart,
  MessageCircle,
  Star,
  ArrowRight,
  Play,
  CheckCircle,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/auth-provider'

const features = [
  {
    icon: Camera,
    title: '实时照片直播',
    description: '摄影师拍摄的照片实时同步到观众设备，让每个精彩瞬间都不错过',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Users,
    title: '多人协作',
    description: '支持多个摄影师同时上传，观众可以实时互动评论和点赞',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Shield,
    title: '隐私保护',
    description: '灵活的隐私设置，支持私密会话和访问控制，保护您的珍贵回忆',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Download,
    title: '高质量下载',
    description: '支持原图下载，多种分辨率选择，满足不同使用需求',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: Zap,
    title: '极速体验',
    description: '基于WebSocket的实时通信，毫秒级延迟，流畅的用户体验',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  {
    icon: Globe,
    title: '跨平台支持',
    description: '支持Web、移动端，随时随地访问您的照片直播',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
]

const useCases = [
  {
    title: '婚礼现场',
    description: '让亲友实时看到婚礼精彩瞬间',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop',
    tags: ['婚礼', '现场直播', '家庭'],
  },
  {
    title: '活动摄影',
    description: '企业活动、会议的实时照片分享',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=300&fit=crop',
    tags: ['企业', '活动', '会议'],
  },
  {
    title: '旅行记录',
    description: '与家人朋友分享旅途美好时光',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
    tags: ['旅行', '分享', '回忆'],
  },
  {
    title: '体育赛事',
    description: '运动会、比赛的精彩瞬间直播',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
    tags: ['体育', '赛事', '直播'],
  },
]

const testimonials = [
  {
    name: '张摄影师',
    role: '婚礼摄影师',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    content: '这个平台让我的客户能够实时看到婚礼照片，他们都非常满意！操作简单，功能强大。',
    rating: 5,
  },
  {
    name: '李女士',
    role: '新娘',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    content: '婚礼当天无法参加的亲友通过这个平台看到了所有精彩瞬间，感觉他们就在现场一样。',
    rating: 5,
  },
  {
    name: '王总',
    role: '企业负责人',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    content: '公司年会使用了这个服务，员工们都能实时看到活动照片，大大提升了参与感。',
    rating: 5,
  },
]

const stats = [
  { label: '活跃用户', value: '10,000+' },
  { label: '照片分享', value: '1,000,000+' },
  { label: '成功会话', value: '50,000+' },
  { label: '用户满意度', value: '99%' },
]

export default function HomePage() {
  const [joinCode, setJoinCode] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim()) {
      router.push(`/join?code=${joinCode.trim()}`)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-gray-900">PictureLive</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                功能特色
              </a>
              <a href="#use-cases" className="text-gray-600 hover:text-gray-900 transition-colors">
                使用场景
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">
                用户评价
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link href={user.role === 'photographer' ? '/dashboard' : '/join'}>
                    <Button variant="outline">
                      {user.role === 'photographer' ? '仪表板' : '加入会话'}
                    </Button>
                  </Link>
                  <span className="text-sm text-gray-600">欢迎，{user.displayName}</span>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline">登录</Button>
                  </Link>
                  <Link href="/register">
                    <Button>注册</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 英雄区域 */}
      <section className="relative bg-gradient-to-br from-primary/5 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                实时照片直播
                <span className="block text-primary">让每个瞬间都精彩</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                专业的照片直播平台，让摄影师和观众实时分享精彩瞬间。
                无论是婚礼、活动还是旅行，都能让远方的亲友感受现场的美好。
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {user?.role === 'photographer' ? (
                  <Link href="/session/create">
                    <Button size="lg" className="w-full sm:w-auto">
                      <Camera className="h-5 w-5 mr-2" />
                      创建直播会话
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto">
                      <Play className="h-5 w-5 mr-2" />
                      开始使用
                    </Button>
                  </Link>
                )}
                
                <form onSubmit={handleJoinSession} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入访问码"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent flex-1"
                  />
                  <Button type="submit" variant="outline">
                    加入
                  </Button>
                </form>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>免费使用</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>实时同步</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>高清画质</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`https://picsum.photos/200/200?random=${i}`}
                        alt={`示例照片 ${i}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">
                  实时更新
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white shadow-lg rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">12 人在线观看</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 统计数据 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 功能特色 */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              强大的功能特色
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              我们提供专业级的照片直播解决方案，让每个重要时刻都能被完美记录和分享
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用场景 */}
      <section id="use-cases" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              适用场景
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              无论是什么场合，我们都能为您提供完美的照片直播体验
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={useCase.image}
                      alt={useCase.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                    <CardDescription>{useCase.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {useCase.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 用户评价 */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              用户评价
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              听听我们用户的真实反馈
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              准备开始您的照片直播之旅？
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              立即注册，体验专业的实时照片分享服务
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                user.role === 'photographer' ? (
                  <Link href="/session/create">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      <Camera className="h-5 w-5 mr-2" />
                      创建直播会话
                    </Button>
                  </Link>
                ) : (
                  <Link href="/join">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      <Users className="h-5 w-5 mr-2" />
                      加入会话
                    </Button>
                  </Link>
                )
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      免费注册
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary">
                      立即登录
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">PictureLive</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                专业的实时照片直播平台，让每个重要时刻都能被完美记录和分享。
              </p>
              <div className="flex items-center space-x-4">
                <Monitor className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">支持所有设备</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">产品</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">功能特色</a></li>
                <li><a href="#use-cases" className="hover:text-white transition-colors">使用场景</a></li>
                <li><a href="#" className="hover:text-white transition-colors">定价方案</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API文档</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">支持</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-white transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PictureLive. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
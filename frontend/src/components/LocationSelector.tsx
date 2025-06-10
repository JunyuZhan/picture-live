'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search, MapPin } from 'lucide-react'

interface LocationSelectorProps {
  value?: string
  onChange: (location: string) => void
  placeholder?: string
}

interface LocationItem {
  name: string
  type: 'city' | 'country'
  country?: string
  province?: string
}

// 中国主要城市数据（精简版）
const chinaCities: LocationItem[] = [
  // 直辖市
  { name: '北京市', type: 'city', country: '中国', province: '北京' },
  { name: '上海市', type: 'city', country: '中国', province: '上海' },
  { name: '天津市', type: 'city', country: '中国', province: '天津' },
  { name: '重庆市', type: 'city', country: '中国', province: '重庆' },
  
  // 广东省
  { name: '广州市', type: 'city', country: '中国', province: '广东' },
  { name: '深圳市', type: 'city', country: '中国', province: '广东' },
  { name: '珠海市', type: 'city', country: '中国', province: '广东' },
  { name: '佛山市', type: 'city', country: '中国', province: '广东' },
  { name: '东莞市', type: 'city', country: '中国', province: '广东' },
  { name: '中山市', type: 'city', country: '中国', province: '广东' },
  { name: '惠州市', type: 'city', country: '中国', province: '广东' },
  { name: '江门市', type: 'city', country: '中国', province: '广东' },
  { name: '湛江市', type: 'city', country: '中国', province: '广东' },
  
  // 江苏省
  { name: '南京市', type: 'city', country: '中国', province: '江苏' },
  { name: '苏州市', type: 'city', country: '中国', province: '江苏' },
  { name: '无锡市', type: 'city', country: '中国', province: '江苏' },
  { name: '常州市', type: 'city', country: '中国', province: '江苏' },
  { name: '徐州市', type: 'city', country: '中国', province: '江苏' },
  { name: '南通市', type: 'city', country: '中国', province: '江苏' },
  { name: '扬州市', type: 'city', country: '中国', province: '江苏' },
  
  // 浙江省
  { name: '杭州市', type: 'city', country: '中国', province: '浙江' },
  { name: '宁波市', type: 'city', country: '中国', province: '浙江' },
  { name: '温州市', type: 'city', country: '中国', province: '浙江' },
  { name: '嘉兴市', type: 'city', country: '中国', province: '浙江' },
  { name: '湖州市', type: 'city', country: '中国', province: '浙江' },
  
  // 山东省
  { name: '济南市', type: 'city', country: '中国', province: '山东' },
  { name: '青岛市', type: 'city', country: '中国', province: '山东' },
  { name: '烟台市', type: 'city', country: '中国', province: '山东' },
  { name: '潍坊市', type: 'city', country: '中国', province: '山东' },
  { name: '临沂市', type: 'city', country: '中国', province: '山东' },
  
  // 河南省
  { name: '郑州市', type: 'city', country: '中国', province: '河南' },
  { name: '洛阳市', type: 'city', country: '中国', province: '河南' },
  { name: '新乡市', type: 'city', country: '中国', province: '河南' },
  { name: '焦作市', type: 'city', country: '中国', province: '河南' },
  
  // 湖北省
  { name: '武汉市', type: 'city', country: '中国', province: '湖北' },
  { name: '宜昌市', type: 'city', country: '中国', province: '湖北' },
  { name: '襄阳市', type: 'city', country: '中国', province: '湖北' },
  
  // 湖南省
  { name: '长沙市', type: 'city', country: '中国', province: '湖南' },
  { name: '株洲市', type: 'city', country: '中国', province: '湖南' },
  { name: '湘潭市', type: 'city', country: '中国', province: '湖南' },
  
  // 四川省
  { name: '成都市', type: 'city', country: '中国', province: '四川' },
  { name: '绵阳市', type: 'city', country: '中国', province: '四川' },
  { name: '德阳市', type: 'city', country: '中国', province: '四川' },
  
  // 陕西省
  { name: '西安市', type: 'city', country: '中国', province: '陕西' },
  { name: '宝鸡市', type: 'city', country: '中国', province: '陕西' },
  { name: '咸阳市', type: 'city', country: '中国', province: '陕西' },
  
  // 辽宁省
  { name: '沈阳市', type: 'city', country: '中国', province: '辽宁' },
  { name: '大连市', type: 'city', country: '中国', province: '辽宁' },
  { name: '鞍山市', type: 'city', country: '中国', province: '辽宁' },
  
  // 吉林省
  { name: '长春市', type: 'city', country: '中国', province: '吉林' },
  { name: '吉林市', type: 'city', country: '中国', province: '吉林' },
  
  // 黑龙江省
  { name: '哈尔滨市', type: 'city', country: '中国', province: '黑龙江' },
  { name: '大庆市', type: 'city', country: '中国', province: '黑龙江' },
  
  // 其他省份省会
  { name: '石家庄市', type: 'city', country: '中国', province: '河北' },
  { name: '太原市', type: 'city', country: '中国', province: '山西' },
  { name: '呼和浩特市', type: 'city', country: '中国', province: '内蒙古' },
  { name: '南宁市', type: 'city', country: '中国', province: '广西' },
  { name: '海口市', type: 'city', country: '中国', province: '海南' },
  { name: '贵阳市', type: 'city', country: '中国', province: '贵州' },
  { name: '昆明市', type: 'city', country: '中国', province: '云南' },
  { name: '拉萨市', type: 'city', country: '中国', province: '西藏' },
  { name: '兰州市', type: 'city', country: '中国', province: '甘肃' },
  { name: '西宁市', type: 'city', country: '中国', province: '青海' },
  { name: '银川市', type: 'city', country: '中国', province: '宁夏' },
  { name: '乌鲁木齐市', type: 'city', country: '中国', province: '新疆' },
  
  // 港澳台
  { name: '香港', type: 'city', country: '中国', province: '香港特别行政区' },
  { name: '澳门', type: 'city', country: '中国', province: '澳门特别行政区' },
  { name: '台北', type: 'city', country: '中国', province: '台湾' },
]

// 世界主要国家
const worldCountries: LocationItem[] = [
  { name: '美国', type: 'country' },
  { name: '英国', type: 'country' },
  { name: '法国', type: 'country' },
  { name: '德国', type: 'country' },
  { name: '意大利', type: 'country' },
  { name: '西班牙', type: 'country' },
  { name: '俄罗斯', type: 'country' },
  { name: '日本', type: 'country' },
  { name: '韩国', type: 'country' },
  { name: '新加坡', type: 'country' },
  { name: '马来西亚', type: 'country' },
  { name: '泰国', type: 'country' },
  { name: '越南', type: 'country' },
  { name: '印度', type: 'country' },
  { name: '澳大利亚', type: 'country' },
  { name: '新西兰', type: 'country' },
  { name: '加拿大', type: 'country' },
  { name: '巴西', type: 'country' },
  { name: '阿根廷', type: 'country' },
  { name: '墨西哥', type: 'country' },
  { name: '土耳其', type: 'country' },
  { name: '埃及', type: 'country' },
  { name: '南非', type: 'country' },
  { name: '荷兰', type: 'country' },
  { name: '比利时', type: 'country' },
  { name: '瑞士', type: 'country' },
  { name: '奥地利', type: 'country' },
  { name: '瑞典', type: 'country' },
  { name: '挪威', type: 'country' },
  { name: '丹麦', type: 'country' },
  { name: '芬兰', type: 'country' },
  { name: '波兰', type: 'country' },
  { name: '捷克', type: 'country' },
  { name: '匈牙利', type: 'country' },
  { name: '希腊', type: 'country' },
  { name: '葡萄牙', type: 'country' },
  { name: '爱尔兰', type: 'country' },
  { name: '以色列', type: 'country' },
  { name: '阿联酋', type: 'country' },
  { name: '沙特阿拉伯', type: 'country' },
  { name: '卡塔尔', type: 'country' },
]

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value,
  onChange,
  placeholder = '请选择活动地点'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'china' | 'world'>('china')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 合并所有地点数据
  const allLocations = [...chinaCities, ...worldCountries]

  // 过滤地点
  const filteredLocations = allLocations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (location.province && location.province.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (activeTab === 'china') {
      return location.type === 'city' && matchesSearch
    } else {
      return location.type === 'country' && matchesSearch
    }
  })

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocationSelect = (location: LocationItem) => {
    let locationString = location.name
    if (location.type === 'city' && location.province) {
      locationString = `${location.province}·${location.name}`
    }
    onChange(locationString)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleInputClick = () => {
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* 输入框 */}
      <div
        onClick={handleInputClick}
        className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* 下拉框 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="搜索地点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('china')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'china'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🇨🇳 中国城市
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('world')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'world'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🌍 世界国家
            </button>
          </div>

          {/* 地点列表 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location, index) => (
                <button
                  key={`${location.name}-${index}`}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{location.name}</div>
                      {location.province && (
                        <div className="text-sm text-gray-500">{location.province}</div>
                      )}
                    </div>
                    {location.type === 'city' && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">城市</span>
                    )}
                    {location.type === 'country' && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">国家</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>未找到匹配的地点</p>
                <p className="text-sm">请尝试其他关键词</p>
              </div>
            )}
          </div>

          {/* 提示文字 */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {activeTab === 'china' 
                ? '国内请选择到地级市，如"广东·深圳市"' 
                : '国外请选择国家，如"美国"'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LocationSelector
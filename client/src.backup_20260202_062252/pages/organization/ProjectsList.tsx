import { Link } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ProjectsList() {
  const { isRTL } = useLanguage();
  
  // Mock projects - would come from API
  const projects = [
    {
      id: '1',
      title: 'Promoting Inclusion and Social Change through Sports',
      code: 'ADIDAS-YEM 007',
      status: 'active' as const,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      budget: 0,
      completion: 0
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-page-title font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage and track all your projects</p>
        </div>
        <button className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Plus className="w-5 h-5" />
          Create Project
        </button>
      </div>
      
      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
            <input
              type="text"
              placeholder="Search projects..."
              className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
            />
          </div>
          <select className={`px-4 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
            <option>All Status</option>
            <option>Active</option>
            <option>Planned</option>
            <option>Completed</option>
          </select>
        </div>
      </div>
      
      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-lg font-semibold text-gray-900 line-clamp-2 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {project.title}
              </h3>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full uppercase shrink-0">
                {project.status}
              </span>
            </div>
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {project.code}
            </p>
            <div className="space-y-2">
              <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">Budget:</span>
                <span className="font-medium" dir="ltr">${project.budget.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">Completion:</span>
                <span className="font-medium" dir="ltr">{project.completion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2" dir="ltr">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${project.completion}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
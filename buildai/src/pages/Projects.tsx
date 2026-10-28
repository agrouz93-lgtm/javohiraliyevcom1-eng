import { useState } from 'react';
import { useAppStore } from '@/store';
import { t } from '@/translations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Folder, Plus, Edit, Copy, Trash2, Clock, Home, ArrowRight } from 'lucide-react';
import { useNav } from '@/context/NavContext';

export function ProjectsPage({ openNewProject = false }: { openNewProject?: boolean } = {}) {
  const { language, projects, addProject, setProjects, deleteProject: deleteProjectStore, currentProject, setCurrentProject } = useAppStore();
  const [search, setSearch] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState<boolean>(openNewProject);
  const { setActivePage } = useNav();

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const createProject = () => {
    if (!newProjectName.trim()) return;
    const project = {
      id: Date.now().toString(),
      name: newProjectName,
      description: '',
      area: 0,
      roomCount: 0,
      wallLength: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addProject(project);
    setNewProjectName('');
    setCreating(false);
  };

  const deleteProject = (id: string) => {
    if (window.confirm('Loyihanini o\'chirishni tasdiqlaysizmi?')) {
      deleteProjectStore(id);
    }
  };

  const copyProject = (project: any) => {
    const copy = { ...project, id: Date.now().toString(), name: `${project.name} (nusxa)`, createdAt: new Date(), updatedAt: new Date() };
    setProjects([...projects, copy]);
  };


  return (
    <div className="min-h-screen bg-[#061426]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F8FF]">{t(language, 'projects')}</h1>
            <p className="text-[#9EB7D3]">{t(language, 'myProjectsDesc')}</p>
          </div>
          <div className="flex gap-3">
            <Input placeholder={t(language, 'searchProjects')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-md" />
            <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> {t(language, 'newProject')}</Button>
          </div>
        </div>

        {creating && (
          <div className="mb-6 bg-[#102943] border border-[#1677FF]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <Input
              autoFocus
              placeholder="Loyiha nomi"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
                if (e.key === 'Escape') { setCreating(false); setNewProjectName(''); }
              }}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={createProject}>{t(language, 'save')}</Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setCreating(false); setNewProjectName(''); }}
              >
                {t(language, 'cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} hoverable className="cursor-pointer group p-6" onClick={() => setCurrentProject(project)}>
              <div className="h-32 bg-[#102943] border border-[#174D78] rounded-xl mb-4 flex items-center justify-center"><Home className="w-12 h-12 text-[#9EB7D3]" /></div>
              <h3 className="text-[#F5F8FF] font-semibold mb-1">{project.name}</h3>
              <p className="text-[#9EB7D3] text-sm mb-4">{project.description || 'Tavsif yo\'q'}</p>
              <div className="flex justify-between text-xs text-[#6B7C93] mb-4"><span>{project.area} mВІ</span><span>{project.roomCount} xona</span><span><Clock className="w-3 h-3 inline mr-1" /> {new Date(project.updatedAt).toLocaleDateString()}</span></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setCurrentProject(project); setActivePage('planner'); }}><Edit className="w-3 h-3" /></Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); copyProject(project); }}><Copy className="w-3 h-3" /></Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          ))}
          {filteredProjects.length === 0 && (
            <div className="lg:col-span-3 flex flex-col items-center justify-center py-20 text-center">
              <Folder className="w-16 h-16 text-[#6B7C93] mb-4" />
              <h3 className="text-[#F5F8FF] font-semibold mb-2">Loyihalar yo'q</h3>
              <p className="text-[#9EB7D3] text-sm mb-6">Yangi loyiha yarating boshlash uchun</p>
              <Button onClick={() => setCreating(true)}>{t(language, 'newProject')}</Button>
            </div>
          )}
        </div>

        {currentProject && (
          <div className="mt-8 bg-[#102943] border border-[#174D78] rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#F5F8FF]">{currentProject.name}</h3>
                <p className="text-[#9EB7D3] text-sm">{currentProject.description || ''}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentProject(null)}>Yopish</Button>
                <Button onClick={() => setActivePage('planner')}><ArrowRight className="w-4 h-4 mr-2" /> Davom ettirish</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0A1D33] p-4 rounded-lg border border-[#174D78]"><span className="text-[#9EB7D3] text-xs block">Maydon</span><span className="text-[#F5F8FF] font-bold">{currentProject.area} mВІ</span></div>
              <div className="bg-[#0A1D33] p-4 rounded-lg border border-[#174D78]"><span className="text-[#9EB7D3] text-xs block">Xona soni</span><span className="text-[#F5F8FF] font-bold">{currentProject.roomCount}</span></div>
              <div className="bg-[#0A1D33] p-4 rounded-lg border border-[#174D78]"><span className="text-[#9EB7D3] text-xs block">Devor uzunligi</span><span className="text-[#F5F8FF] font-bold">{currentProject.wallLength} m</span></div>
              <div className="bg-[#0A1D33] p-4 rounded-lg border border-[#174D78]"><span className="text-[#9EB7D3] text-xs block">Yaratilgan</span><span className="text-[#F5F8FF] font-bold text-xs">{new Date(currentProject.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

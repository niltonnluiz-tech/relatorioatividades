import React, { useState } from 'react';
import { User } from '../types';
import { sqlDb } from '../services/sqlDb';
import { SectorItem } from '../constants/sectors';
import { Building, Plus, Edit3, Trash2, ShieldCheck, X, Save, CheckCircle2 } from 'lucide-react';

interface Props {
  currentUser: User;
  onRefresh: () => void;
}

export const AdminDepartmentsManagement: React.FC<Props> = ({ currentUser, onRefresh }) => {
  const [sectors, setSectors] = useState<SectorItem[]>(sqlDb.getSectors());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPosition, setDefaultPosition] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshList = () => {
    setSectors(sqlDb.getSectors());
    onRefresh();
  };

  const handleOpenCreate = () => {
    setEditingSector(null);
    setName('');
    setDescription('');
    setDefaultPosition('Coordenador(a)');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sector: SectorItem) => {
    setEditingSector(sector);
    setName(sector.name);
    setDescription(sector.description);
    setDefaultPosition(sector.defaultPosition);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setErrorMsg('Por favor preencha o Nome e a Descrição do Departamento.');
      return;
    }

    try {
      if (editingSector) {
        await sqlDb.updateDepartment(editingSector.id, {
          name: name.trim(),
          description: description.trim(),
          defaultPosition: defaultPosition.trim() || 'Coordenador(a)',
        }, currentUser);
        setActionNotice(`Departamento ${name.trim()} atualizado com sucesso!`);
      } else {
        await sqlDb.addDepartment({
          name: name.trim(),
          description: description.trim(),
          defaultPosition: defaultPosition.trim() || 'Coordenador(a)',
        }, currentUser);
        setActionNotice(`Novo departamento ${name.trim()} cadastrado com sucesso!`);
      }

      setIsModalOpen(false);
      setTimeout(() => setActionNotice(null), 3500);
      refreshList();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao salvar departamento.');
    }
  };

  const handleDelete = async (sector: SectorItem) => {
    if (confirm(`Tem certeza que deseja excluir o departamento ${sector.name}?`)) {
      try {
        await sqlDb.deleteDepartment(sector.id, currentUser);
        setActionNotice(`Departamento ${sector.name} excluído com sucesso.`);
        setTimeout(() => setActionNotice(null), 3500);
        refreshList();
      } catch (err: any) {
        alert(err?.message || 'Erro ao excluir departamento.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Building className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Gestão de Departamentos & Setores
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre, edite e gerencie os departamentos institucionais e seus cargos padrões.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Departamento
          </button>
        </div>

        {actionNotice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* Sectors Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-700 uppercase font-black tracking-wider border-b border-gray-200">
                <th className="p-4">Departamento / Setor</th>
                <th className="p-4">Descrição Institucional</th>
                <th className="p-4">Cargo Padrão</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sectors.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 font-bold text-gray-900">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        <Building className="w-4 h-4" />
                      </span>
                      <div>
                        <span>{s.name}</span>
                        <span className="block text-[10px] text-gray-400 font-mono">ID: {s.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 max-w-md truncate">
                    {s.description}
                  </td>
                  <td className="p-4 font-semibold text-gray-700">
                    {s.defaultPosition}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-blue-200"
                        title="Editar departamento"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir departamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit Department */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0B0F19] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    {editingSector ? 'Editar Departamento' : 'Cadastrar Novo Departamento'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Defina o nome, descrição e cargo padrão do setor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nome do Departamento / Setor
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Inovação & Tecnologia"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Descrição Institucional
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve resumo das atividades e atribuições do setor..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Cargo Padrão do Coordenador / Responsável
                </label>
                <input
                  type="text"
                  value={defaultPosition}
                  onChange={(e) => setDefaultPosition(e.target.value)}
                  placeholder="Ex: Coordenador(a) de Inovação"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" /> Salvar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

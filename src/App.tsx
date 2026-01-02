import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from './supabase';
import { 
  LayoutDashboard, Store, 
  Plus, Search, LogOut, CheckCircle, XCircle, 
  Edit, Trash2, Lock, Unlock, CalendarDays, Ban, Menu, X 
} from 'lucide-react'; // Thêm icon Menu và X
import { format, addYears } from 'date-fns';

// --- 1. TYPES ---
type Tenant = {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  start_date: string;
  expired_at: string;
  active: boolean;
  logo_url: string;
  owner_id: string;
};

// --- 2. COMPONENTS PHỤ ---
const SidebarItem = ({ icon, label, active, onClick, badge }: any) => (
  <div onClick={onClick} className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <div className="flex items-center gap-3">
      {icon} <span className="font-medium text-sm">{label}</span>
    </div>
    {badge > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>}
  </div>
);

const DashboardStats = ({ tenants }: { tenants: Tenant[] }) => {
  const activeCount = tenants.filter(t => t.active).length;
  const inactiveCount = tenants.length - activeCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-slate-500 text-sm font-medium mb-1">Tổng số quán</div>
        <div className="text-3xl font-bold text-slate-800">{tenants.length}</div>
      </div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
         <div className="text-slate-500 text-sm font-medium mb-1">Đang hoạt động</div>
         <div className="text-3xl font-bold text-emerald-600">{activeCount}</div>
      </div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
         <div className="text-slate-500 text-sm font-medium mb-1">Hết hạn / Đã khóa</div>
         <div className="text-3xl font-bold text-red-600">{inactiveCount}</div>
      </div>
    </div>
  );
};

// --- 3. MAIN COMPONENT ---
export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('shops'); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State cho Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', owner: '', email: '', pass: '', 
    startDate: '', endDate: '' 
  });

  useEffect(() => {
    fetchTenants(); 
  }, []); 

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (error) console.error("Lỗi tải:", error);
    if (data) setTenants(data);
    setLoading(false);
  };

  const getDisplayTenants = () => {
    let filtered = tenants;
    if (activeTab === 'locked_shops') {
       filtered = tenants.filter(t => !t.active || new Date(t.expired_at) < new Date());
    }
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(lowerTerm) ||
        t.owner_name?.toLowerCase().includes(lowerTerm) ||
        t.email?.toLowerCase().includes(lowerTerm)
      );
    }
    return filtered;
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "KHÓA" : "MỞ KHÓA";
    if (!window.confirm(`Bạn có chắc muốn ${action} quán này không?`)) return;
    try {
      await supabase.from('tenants').update({ active: !currentStatus }).eq('id', id);
      fetchTenants(); 
    } catch (e: any) { alert("Lỗi: " + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa vĩnh viễn quán này?")) return;
    try {
      await supabase.from('tenants').delete().eq('id', id);
      alert("Đã xóa!");
      fetchTenants();
    } catch (e: any) { alert("Lỗi xóa: " + e.message); }
  };

  const openEditModal = (shop: Tenant) => {
    setEditingId(shop.id);
    const sDate = shop.start_date ? shop.start_date.split('T')[0] : new Date().toISOString().split('T')[0];
    const eDate = shop.expired_at ? shop.expired_at.split('T')[0] : '';
    setFormData({
      name: shop.name, owner: shop.owner_name, email: shop.email, 
      pass: '', 
      startDate: sDate, endDate: eDate
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingId(null);
    const today = new Date();
    const nextYear = addYears(today, 1);
    setFormData({ 
      name: '', owner: '', email: '', 
      pass: '123456', 
      startDate: today.toISOString().split('T')[0],
      endDate: nextYear.toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if(!formData.name || !formData.email || !formData.startDate || !formData.endDate) 
      return alert("Vui lòng nhập đủ thông tin và ngày hạn!");

    try {
      const endDateObj = new Date(formData.endDate);
      const now = new Date();
      now.setHours(0,0,0,0);
      const isActive = endDateObj >= now;

      const payload: any = {
        name: formData.name,
        owner_name: formData.owner,
        email: formData.email,
        start_date: new Date(formData.startDate).toISOString(),
        expired_at: new Date(formData.endDate).toISOString(),
      };
      
      if (isActive) payload.active = true;

      if (editingId) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', editingId);
        if (error) throw error;

        if (formData.pass && formData.pass.trim() !== "") {
          const currentTenant = tenants.find(t => t.id === editingId);
          if (currentTenant && currentTenant.owner_id) {
            const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(
              currentTenant.owner_id, 
              { password: formData.pass }
            );
            if (passError) alert("Lỗi đổi pass: " + passError.message);
            else alert("Cập nhật thông tin & Đổi mật khẩu thành công!");
          }
        } else {
          alert("Cập nhật thông tin thành công!");
        }
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.pass || '123456',
          email_confirm: true,
          user_metadata: { full_name: formData.owner, role: 'tenant_admin' }
        });
        if (authError) throw authError;

        const { data: tenantData, error: tenantError } = await supabase.from('tenants').insert([{
          ...payload,
          active: true, 
          owner_id: authData.user.id
        }]).select().single();

        if (tenantError) throw tenantError;
        if (tenantData) await supabaseAdmin.from('profiles').update({ tenant_id: tenantData.id }).eq('id', authData.user.id);
        alert(`Tạo quán thành công!`);
      }
      setShowModal(false);
      fetchTenants(); 
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  const lockedCount = tenants.filter(t => !t.active || new Date(t.expired_at) < new Date()).length;
  const displayTenants = getDisplayTenants();

  // Hàm chuyển Tab và đóng Menu Mobile
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm('');
    setIsMobileMenuOpen(false); // Đóng menu sau khi chọn
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans relative">
      
      {/* --- MOBILE OVERLAY (Màn đen mờ khi mở menu) --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR (RESPONSIVE) --- */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">PosTL Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Super Management</p>
          </div>
          {/* Nút đóng menu trên mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Tổng quan" active={activeTab === 'dashboard'} onClick={()=>switchTab('dashboard')} />
          <SidebarItem icon={<Store size={20}/>} label="Tất cả quán" active={activeTab === 'shops'} onClick={()=>switchTab('shops')} />
          <SidebarItem icon={<Ban size={20}/>} label="Quán đã khóa" active={activeTab === 'locked_shops'} onClick={()=>switchTab('locked_shops')} badge={lockedCount} />
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          <button className="flex items-center gap-3 text-slate-300 hover:text-white w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition">
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Nút Menu Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'shops' ? 'Danh sách Cửa hàng' : 'Các Quán Đang Khóa'}
            </h2>
          </div>
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm md:text-base">A</div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === 'dashboard' && <DashboardStats tenants={tenants} />}

          {(activeTab === 'shops' || activeTab === 'locked_shops') && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-full">
              {/* Toolbar */}
              <div className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 shrink-0">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm quán, chủ quán, email..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {activeTab === 'shops' && (
                  <button onClick={openCreateModal} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200">
                    <Plus size={18} /> <span className="md:inline">Tạo Mới</span>
                  </button>
                )}
              </div>

              {/* TABLE CONTAINER (Quan trọng: overflow-auto để cuộn bảng) */}
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left min-w-[800px]"> {/* min-w để ép bảng không bị co dúm trên mobile */}
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 bg-slate-50">Tên Quán</th>
                      <th className="px-6 py-4 bg-slate-50">Chủ sở hữu</th>
                      <th className="px-6 py-4 bg-slate-50">Trạng thái</th>
                      <th className="px-6 py-4 bg-slate-50">Thời hạn HĐ</th>
                      <th className="px-6 py-4 text-right bg-slate-50">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                    ) : displayTenants.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không tìm thấy quán nào.</td></tr>
                    ) : displayTenants.map((shop) => {
                      const isExpired = new Date(shop.expired_at) < new Date();
                      const statusLabel = isExpired ? 'Hết hạn' : (shop.active ? 'Hoạt động' : 'Đã khóa');
                      let statusColor = 'bg-slate-100 text-slate-700';
                      if (isExpired) statusColor = 'bg-red-100 text-red-700';
                      else if (shop.active) statusColor = 'bg-emerald-100 text-emerald-700';

                      return (
                        <tr key={shop.id} className={`hover:bg-slate-50 transition ${isExpired ? 'opacity-70' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               {shop.logo_url ? (
                                 <img src={shop.logo_url} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                               ) : (
                                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Store size={20}/></div>
                               )}
                               <div>
                                  <div className="font-medium text-slate-900">{shop.name}</div>
                                  <div className="text-xs text-slate-500">{shop.email || 'Chưa có email'}</div>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{shop.owner_name || '---'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {shop.active && !isExpired ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-xs">
                             <div className="flex items-center gap-1 text-emerald-600"><CalendarDays size={14}/> {shop.start_date ? format(new Date(shop.start_date), 'dd/MM/yyyy') : '-'}</div>
                             <div className="flex items-center gap-1 text-red-500 mt-1"><CalendarDays size={14}/> {shop.expired_at ? format(new Date(shop.expired_at), 'dd/MM/yyyy') : '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditModal(shop)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full bg-white border border-slate-200 shadow-sm" title="Sửa thông tin">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => handleToggleStatus(shop.id, shop.active)} className={`p-2 rounded-full border shadow-sm bg-white ${shop.active ? 'text-amber-500 border-amber-200' : 'text-emerald-600 border-emerald-200'}`} title={shop.active ? "Khóa ngay" : "Mở khóa ngay"}>
                                {shop.active ? <Unlock size={18} /> : <Lock size={18} />}
                              </button>
                              <button onClick={() => handleDelete(shop.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full bg-white border border-slate-200 shadow-sm" title="Xóa vĩnh viễn">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 max-h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Cập nhật & Gia Hạn' : 'Thêm Cửa Hàng Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500"><XCircle size={24}/></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên quán</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên chủ quán</label><input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <div><label className="block text-xs font-bold text-emerald-600 mb-1">NGÀY BẮT ĐẦU</label><input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full border p-2 rounded-lg text-sm" /></div>
                 <div><label className="block text-xs font-bold text-red-600 mb-1">NGÀY HẾT HẠN</label><input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full border p-2 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{editingId ? "Đặt lại Mật Khẩu (Để trống nếu không đổi)" : "Mật khẩu khởi tạo"}</label><input type="text" value={formData.pass} onChange={e => setFormData({...formData, pass: e.target.value})} className="w-full border p-2 rounded-lg border-blue-200 bg-blue-50 text-blue-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder={editingId ? "Nhập mật khẩu mới..." : "123456"} /></div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{editingId ? 'Lưu thay đổi' : 'Xác nhận tạo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
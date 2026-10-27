// src/components/Admin/HospitalPatientsBody.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { 
  Button, Input, Modal, FormField, Badge, IconButton, 
  Sheet, Chip, Pagination, EmptyState 
} from '../ui';
import { InlineSection } from '../Dashboard/inline';
import { 
  PlusIcon, EditIcon, TrashIcon, SearchIcon, FilterIcon, CloseIcon 
} from '../../assets/svgs';

interface HospitalPatientsBodyProps {
  onCountChange?: (n: number) => void;
}

const PAGE_SIZE = 12;
const GENDERS = ['Male', 'Female', 'Other'];

const emptyForm = {
  name: '', age: '', gender: 'Male', phone: '', email: '', address: ''
};

export default function HospitalPatientsBody({
  onCountChange,
}: HospitalPatientsBodyProps = {}) {
  const { tenant } = useTenant();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!tenant) return;
    setIsLoading(true);
    const data = await supabaseService.getHospitalPatients(tenant.slug);
    setPatients(data);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [tenant?.slug]);
  useEffect(() => { setPage(1); }, [search, filterGender]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEditModal = (patient: any) => {
    setEditingId(patient.id);
    setForm({
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || 'Male',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tenant || !form.name) return;
    setIsSaving(true);
    
    if (editingId) {
      await supabaseService.updateHospitalPatient(editingId, form);
    } else {
      await supabaseService.addHospitalPatient(tenant.slug, form);
    }
    
    setIsSaving(false);
    setIsModalOpen(false);
    setForm({ ...emptyForm });
    setEditingId(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabaseService.deleteHospitalPatient(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }
    if (filterGender !== 'All') {
      result = result.filter(p => p.gender === filterGender);
    }
    return result;
  }, [patients, search, filterGender]);

  useEffect(() => {
    if (onCountChange) onCountChange(filteredPatients.length);
  }, [filteredPatients.length, onCountChange]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  const paginatedPatients = filteredPatients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <InlineSection
        title={`Patients (${filteredPatients.length})`}
        actions={
          <Button size="sm" onClick={openAddModal} leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}>
            Add Patient
          </Button>
        }
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Input 
              placeholder="Search patient name, phone, email..." 
              value={search} onChange={e => setSearch(e.target.value)}
              leftIcon={<SearchIcon width={16} height={16} fill="#b3b3b3" />}
              rightIcon={search ? (
                <IconButton variant="ghost" size="xs" onClick={() => setSearch('')}>
                  <CloseIcon width={14} height={14} fill="#4d4d4d" />
                </IconButton>
              ) : undefined}
            />
          </div>
          <Button 
            variant={filterGender !== 'All' ? 'primary' : 'ghost'} 
            onClick={() => setIsFilterOpen(true)}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={filterGender !== 'All' ? (
              <span style={{ background: '#fff', padding: '0 6px', borderRadius: 999, fontSize: 11, color: '#1e7e34', fontWeight: 800 }}>1</span>
            ) : undefined}
          >
            Filters
          </Button>
        </div>

        {isLoading ? <p>Loading...</p> : filteredPatients.length === 0 ? (
          <EmptyState title="No patients found" description="Add your first patient to get started." />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {paginatedPatients.map(p => (
                <div key={p.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{p.name}</h3>
                      <Badge tone="neutral" size="sm">{p.gender}{p.age ? ` . ${p.age} yrs` : ''}</Badge>
                      {p.phone && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>📞 {p.phone}</p>}
                      {p.email && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>✉️ {p.email}</p>}
                      {p.address && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>📍 {p.address}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <IconButton variant="ghost" size="sm" onClick={() => openEditModal(p)} title="Edit">
                        <EditIcon width={14} height={14} fill="currentColor" />
                      </IconButton>
                      <IconButton variant="danger" size="sm" onClick={() => setDeleteTarget(p)} title="Delete">
                        <TrashIcon width={14} height={14} fill="currentColor" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} totalItems={filteredPatients.length} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </InlineSection>

      {/* ADD / EDIT PATIENT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Patient' : 'Add Patient'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editingId ? 'Save Changes' : 'Save Patient'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Patient Name *">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Age">
              <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            </FormField>
            <FormField label="Gender">
              <select 
                value={form.gender} 
                onChange={e => setForm({ ...form, gender: e.target.value })} 
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
              >
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Phone">
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Address">
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        title="Delete Patient"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p>Delete <strong>{deleteTarget?.name}</strong>?</p>
      </Modal>

      {/* FILTER SHEET */}
      <Sheet 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        title="Filter Patients" 
        mobileFullScreen 
        maxHeightVh={86}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFilterGender('All')} block>Reset</Button>
            <Button onClick={() => setIsFilterOpen(false)} block>Apply</Button>
          </>
        }
      >
        <h4 style={{ margin: '0 0 10px', fontSize: 12, textTransform: 'uppercase', color: '#666' }}>Gender</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['All', ...GENDERS].map(g => (
            <Chip key={g} tone="primary" active={filterGender === g} onClick={() => setFilterGender(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}
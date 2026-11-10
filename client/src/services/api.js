const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('@CRM_Token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro na requisição');
  }

  const json = await response.json();
  
  // Backend wraps all responses in { success: true, data: ... }
  // Unwrap automatically so pages receive data directly
  if (json && json.success !== undefined && json.data !== undefined) {
    return json.data;
  }
  
  return json;
};

export default {
  auth: {
    login: (email, password) => fetchWithAuth('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    loginGoogle: (email, nome) => fetchWithAuth('/auth/google', { method: 'POST', body: JSON.stringify({ email, nome }) }),
    register: (data) => fetchWithAuth('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => fetchWithAuth('/auth/me'),
    updateProfile: (data) => fetchWithAuth('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    uploadImage: (image, type) => fetchWithAuth('/upload', { method: 'POST', body: JSON.stringify({ image, type }) }),
  },
  leads: {
    getLeads: (params) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchWithAuth(`/leads${query}`);
    },
    getLead: (id) => fetchWithAuth(`/leads/${id}`),
    createLead: (data) => fetchWithAuth('/leads', { method: 'POST', body: JSON.stringify(data) }),
    updateLead: (id, data) => fetchWithAuth(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    transferirLead: (id, corretor_id) => fetchWithAuth(`/leads/${id}/corretor`, { method: 'PUT', body: JSON.stringify({ corretor_id }) }),
    transferirLeadsEmMassa: (lead_ids, corretor_id) => fetchWithAuth('/leads/bulk-transfer', { method: 'POST', body: JSON.stringify({ lead_ids, corretor_id }) }),
    moveLeadEtapa: (id, etapa, motivo) => fetchWithAuth(`/leads/${id}/etapa`, { method: 'PUT', body: JSON.stringify({ etapa, perdido_motivo: motivo }) }),
    fecharVenda: (id, data) => fetchWithAuth(`/leads/${id}/fechar_venda`, { method: 'POST', body: JSON.stringify(data) }),
    addNota: (id, descricao) => fetchWithAuth(`/leads/${id}/nota`, { method: 'POST', body: JSON.stringify({ descricao }) }),
    getHistorico: (id) => fetchWithAuth(`/leads/${id}/historico`),
    deleteLead: (id) => fetchWithAuth(`/leads/${id}`, { method: 'DELETE' }),
    clearAllLeads: () => fetchWithAuth('/leads/clear-all', { method: 'POST' }),
  },
  empreendimentos: {
    getEmpreendimentos: () => fetchWithAuth('/empreendimentos'),
    getEmpreendimento: (id) => fetchWithAuth(`/empreendimentos/${id}`),
    createEmpreendimento: (data) => fetchWithAuth('/empreendimentos', { method: 'POST', body: JSON.stringify(data) }),
    updateEmpreendimento: (id, data) => fetchWithAuth(`/empreendimentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmpreendimento: (id) => fetchWithAuth(`/empreendimentos/${id}`, { method: 'DELETE' }),
  },
  unidades: {
    getUnidades: (empId) => fetchWithAuth(`/empreendimentos/${empId}/unidades`),
    createUnidade: (data) => fetchWithAuth('/unidades', { method: 'POST', body: JSON.stringify(data) }),
    updateUnidade: (id, data) => fetchWithAuth(`/unidades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    reservarUnidade: (id, data) => fetchWithAuth(`/unidades/${id}/reservar`, { method: 'POST', body: JSON.stringify(data) }),
    liberarUnidade: (id) => fetchWithAuth(`/unidades/${id}/liberar`, { method: 'POST' }),
  },
  blocos: {
    createBloco: (empId, data) => fetchWithAuth(`/empreendimentos/${empId}/blocos`, { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    getDashboardCorretor: () => fetchWithAuth('/dashboard/corretor'),
    getDashboardGestor: () => fetchWithAuth('/dashboard/gestor'),
    getCorretorPerformance: (id) => fetchWithAuth(`/dashboard/corretor/${id}/performance`),
  },
  rodizio: {
    getRodizioConfig: () => fetchWithAuth('/rodizio/config'),
    updateRodizioConfig: (data) => fetchWithAuth('/rodizio/config', { method: 'PUT', body: JSON.stringify(data) }),
    getCorretoresRodizio: () => fetchWithAuth('/rodizio/corretores'),
    pausarCorretor: (id, pausar) => fetchWithAuth(`/rodizio/corretor/${id}/pausar`, { method: 'PUT', body: JSON.stringify({ pausar }) }),
    toggleDisponivel: (id, disponivel) => fetchWithAuth(`/rodizio/corretor/${id}/disponivel`, { method: 'PUT', body: JSON.stringify({ disponivel }) }),
    updatePesosCorretor: (id, data) => fetchWithAuth(`/rodizio/corretor/${id}/pesos`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  config: {
    getConfig: () => fetchWithAuth('/config'),
    updateConfig: (data) => fetchWithAuth('/config', { method: 'PUT', body: JSON.stringify(data) }),
  },
  metas: {
    getMetas: () => fetchWithAuth('/metas'),
    createMeta: (data) => fetchWithAuth('/metas', { method: 'POST', body: JSON.stringify(data) }),
    updateMeta: (id, data) => fetchWithAuth(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  usuarios: {
    getUsuarios: () => fetchWithAuth('/usuarios'),
    getUsuario: (id) => fetchWithAuth(`/usuarios/${id}`),
    updateUsuario: (id, data) => fetchWithAuth(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleUsuarioAtivo: (id, data) => fetchWithAuth(`/usuarios/${id}/ativo`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUsuario: (id) => fetchWithAuth(`/usuarios/${id}`, { method: 'DELETE' }),
  },
  webhooks: {
    simulateWebhook: (data) => fetchWithAuth('/webhooks/simulate', { method: 'POST', body: JSON.stringify(data) }),
  },
  push: {
    getPublicKey: () => fetchWithAuth('/push/public-key'),
    subscribe: (subscription) => fetchWithAuth('/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
    unsubscribe: (endpoint) => fetchWithAuth('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
    testPush: () => fetchWithAuth('/push/test', { method: 'POST' }),
  },
};

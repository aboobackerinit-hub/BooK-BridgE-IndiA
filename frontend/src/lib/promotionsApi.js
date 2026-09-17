import api from "./api";

// ── Public Endpoints ──────────────────────────────────────────

/**
 * Fetches all active and date-valid store labels.
 */
export const fetchActiveLabels = async () => {
  try {
    const res = await api.get("/promotions/labels");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch active labels", error);
    return [];
  }
};

/**
 * Fetches all active and date-valid promotional banners.
 */
export const fetchActiveBanners = async () => {
  try {
    const res = await api.get("/promotions/banners");
    return res.data;
  } catch (error) {
    console.error("Failed to fetch active banners", error);
    return [];
  }
};

// ── Admin Endpoints (Labels) ────────────────────────────────────

export const fetchAdminLabels = async () => {
  const res = await api.get("/promotions/admin/labels");
  return res.data;
};

export const createLabel = async (data) => {
  const res = await api.post("/promotions/admin/labels", data);
  return res.data;
};

export const updateLabel = async (id, data) => {
  const res = await api.put(`/promotions/admin/labels/${id}`, data);
  return res.data;
};

export const deleteLabel = async (id) => {
  const res = await api.delete(`/promotions/admin/labels/${id}`);
  return res.data;
};

export const toggleLabel = async (id) => {
  const res = await api.patch(`/promotions/admin/labels/${id}/toggle`);
  return res.data;
};

// ── Admin Endpoints (Banners) ───────────────────────────────────

export const fetchAdminBanners = async () => {
  const res = await api.get("/promotions/admin/banners");
  return res.data;
};

export const createBanner = async (data) => {
  const res = await api.post("/promotions/admin/banners", data);
  return res.data;
};

export const updateBanner = async (id, data) => {
  const res = await api.put(`/promotions/admin/banners/${id}`, data);
  return res.data;
};

export const deleteBanner = async (id) => {
  const res = await api.delete(`/promotions/admin/banners/${id}`);
  return res.data;
};

export const toggleBanner = async (id) => {
  const res = await api.patch(`/promotions/admin/banners/${id}/toggle`);
  return res.data;
};

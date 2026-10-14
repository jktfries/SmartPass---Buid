import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  withXSRFToken: true,
  // Deliberately NO default Content-Type. Axios already picks the right one per
  // request: application/json for plain objects, multipart/form-data with the
  // generated boundary for FormData.
  //
  // Forcing application/json here broke every upload in the app: axios v1 sees a
  // JSON content type with FormData data and runs formDataToJSON(), which
  // stringifies the fields. Text fields survived that (so chat messages appeared
  // to work), but File objects don't serialize — avatar uploads 422'd with "The
  // avatar field is required" and chat attachments were dropped with no error.
  headers: { 'Accept': 'application/json' },
})

let csrfFetched = false

async function ensureCsrf() {
  if (csrfFetched) return
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
  csrfFetched = true
}

api.interceptors.request.use(async (config) => {
  const mutating = ['post', 'put', 'patch', 'delete']
  if (mutating.includes((config.method ?? '').toLowerCase())) {
    await ensureCsrf()
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status

    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }

    // Maintenance mode. Without this the middleware's 503 fell through to each
    // page's own catch block, most of which swallow errors — so the app simply
    // stopped loading with nothing on screen to say why, even though the
    // setting's description promised "a maintenance notice".
    if (status === 503 && err.response?.data?.code === 'maintenance_mode'
        && !window.location.pathname.startsWith('/maintenance')) {
      window.location.href = '/maintenance'
    }

    return Promise.reject(err)
  }
)

export default api

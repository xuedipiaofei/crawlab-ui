import {
  getDefaultStoreActions,
  getDefaultStoreGetters,
  getDefaultStoreMutations,
  getDefaultStoreState
} from '@/utils/store';
import useRequest from '@/services/request';
import {
  TAB_NAME_DATA,
  TAB_NAME_FILES, TAB_NAME_GIT,
  TAB_NAME_OVERVIEW,
  TAB_NAME_SCHEDULES,
  TAB_NAME_SETTINGS,
  TAB_NAME_TASKS
} from '@/constants/tab';

const endpoint = '/spiders';

const {
  get,
  post,
  del,
  getList,
} = useRequest();

const state = {
  ...getDefaultStoreState<Spider>('spider'),
  tabs: [
    {id: TAB_NAME_OVERVIEW, title: 'Overview'},
    {id: TAB_NAME_FILES, title: 'Files'},
    {id: TAB_NAME_GIT, title: 'Git'},
    {id: TAB_NAME_TASKS, title: 'Tasks'},
    {id: TAB_NAME_SCHEDULES, title: 'Schedules'},
    {id: TAB_NAME_DATA, title: 'Data'},
    {id: TAB_NAME_SETTINGS, title: 'Settings'},
  ],
  fileNavItems: [],
  activeNavItem: undefined,
  fileContent: '',
  defaultFilePaths: [],
  currentGitBranch: '',
  gitData: {},
  gitChangeSelection: [],
} as SpiderStoreState;

const getters = {
  ...getDefaultStoreGetters<Spider>(),
  gitLogsMap: (state: SpiderStoreState) => {
    const m = new Map<string, GitLog>();
    state.gitData.logs?.forEach(l => {
      if (l.hash) {
        m.set(l.hash, l);
      }
    });
    return m;
  },
} as SpiderStoreGetters;

const mutations = {
  ...getDefaultStoreMutations<Spider>(),
  setFileNavItems: (state: SpiderStoreState, navItems: FileNavItem[]) => {
    state.fileNavItems = navItems;
  },
  setActiveFileNavItem: (state: SpiderStoreState, navItem: FileNavItem) => {
    state.activeNavItem = navItem;
  },
  resetActiveFileNavItem: (state: SpiderStoreState) => {
    state.activeNavItem = undefined;
  },
  setFileContent: (state: SpiderStoreState, content: string) => {
    state.fileContent = content;
  },
  resetFileContent: (state: SpiderStoreState) => {
    state.fileContent = '';
  },
  setDefaultFilePaths: (state: SpiderStoreState, paths: string[]) => {
    state.defaultFilePaths = paths;
  },
  resetDefaultFilePaths: (state: SpiderStoreState) => {
    state.defaultFilePaths = [];
  },
  setCurrentGitBranch: (state: SpiderStoreState, branch: string) => {
    state.currentGitBranch = branch;
  },
  resetCurrentGitBranch: (state: SpiderStoreState) => {
    state.currentGitBranch = '';
  },
  setGitData: (state: SpiderStoreState, data: GitData) => {
    state.gitData = data;
  },
  resetGitData: (state: SpiderStoreState) => {
    state.gitData = {};
  },
  setGitChangeSelection: (state: SpiderStoreState, selection: GitChange[]) => {
    state.gitChangeSelection = selection;
  },
  resetGitChangeSelection: (state: SpiderStoreState) => {
    state.gitChangeSelection = [];
  },
} as SpiderStoreMutations;

const actions = {
  ...getDefaultStoreActions<Spider>(endpoint),
  getList: async ({state, commit}: StoreActionContext<SpiderStoreState>) => {
    const payload = {
      ...state.tablePagination,
      conditions: JSON.stringify(state.tableListFilter),
      sort: JSON.stringify(state.tableListSort),
      stats: true,
    };
    const res = await getList(`/spiders`, payload);
    commit('setTableData', {data: res.data || [], total: res.total});
    return res;
  },
  runById: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {
    id,
    options
  }: { id: string; options: SpiderRunOptions }) => {
    const res = await post(`/spiders/${id}/run`, options);
    return res;
  },
  listDir: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path}: FileRequestPayload) => {
    const res = await get(`${endpoint}/${id}/files/list`, {path});
    const navItems = res.data as FileNavItem[];
    commit('setFileNavItems', navItems);
    return res;
  },
  getFile: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path}: FileRequestPayload) => {
    const res = await get(`${endpoint}/${id}/files/get`, {path});
    commit('setFileContent', res.data);
    return res;
  },
  getFileInfo: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path}: FileRequestPayload) => {
    return await get(`${endpoint}/${id}/files/info`, {path});
  },
  saveFile: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path, data}: FileRequestPayload) => {
    return await post(`${endpoint}/${id}/files/save`, {path, data});
  },
  saveFileBinary: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {
    id,
    path,
    file
  }: FileRequestPayload) => {
    const data = new FormData();
    data.set('path', path as string);
    data.set('file', file as File, file?.name);
    return await post(`${endpoint}/${id}/files/save`, data, null, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },
  saveDir: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path}: FileRequestPayload) => {
    return await post(`${endpoint}/${id}/files/save/dir`, {path});
  },
  renameFile: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {
    id,
    path,
    new_path
  }: FileRequestPayload) => {
    return await post(`${endpoint}/${id}/files/rename`, {path, new_path});
  },
  deleteFile: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path}: FileRequestPayload) => {
    return await del(`${endpoint}/${id}/files/delete`, {path});
  },
  copyFile: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id, path, new_path}: FileRequestPayload) => {
    return await post(`${endpoint}/${id}/files/copy`, {path, new_path});
  },
  getGit: async ({commit}: StoreActionContext<BaseStoreState<Spider>>, {id}: { id: string }) => {
    const res = await get(`${endpoint}/${id}/git`);
    commit('setCurrentGitBranch', res?.data?.current_branch || '');
    commit('setGitData', res?.data || {});
    return res;
  },
  gitPull: async ({state}: StoreActionContext<SpiderStoreState>, {id}: { id: string }) => {
    const res = await post(`${endpoint}/${id}/git/pull`);
    return res;
  },
  gitCommit: async ({state}: StoreActionContext<SpiderStoreState>, {id}: { id: string }) => {
    const paths = state.gitChangeSelection.map(d => d.path);
    const res = await post(`${endpoint}/${id}/git/commit`, {paths});
    return res;
  },
} as SpiderStoreActions;

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
} as SpiderStoreModule;

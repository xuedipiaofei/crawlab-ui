import useList from '@/layouts/list';
import {useStore} from 'vuex';
import {getDefaultUseListOptions, setupListComponent} from '@/utils/list';
import {computed, h, onBeforeMount} from 'vue';
import {TABLE_COLUMN_NAME_ACTIONS} from '@/constants/table';
import {ElMessage, ElMessageBox} from 'element-plus';
import usePluginService from '@/services/plugin/pluginService';
import NavLink from '@/components/nav/NavLink.vue';
import {useRouter} from 'vue-router';
import useRequest from '@/services/request';
import {
  PLUGIN_DEPLOY_MODE_ALL,
  PLUGIN_DEPLOY_MODE_MASTER, PLUGIN_STATUS_ERROR,
  PLUGIN_STATUS_INSTALL_ERROR,
  PLUGIN_STATUS_INSTALLING,
  PLUGIN_STATUS_RUNNING,
  PLUGIN_STATUS_STOPPED
} from '@/constants/plugin';
import PluginStatus from '@/components/plugin/PluginStatus.vue';
import PluginStatusMultiNode from '@/components/plugin/PluginStatusMultiNode.vue';
import PluginPid from '@/components/plugin/PluginPid.vue';
import {translate} from '@/utils/i18n';
import {sendEvent} from '@/admin/umeng';

type Plugin = CPlugin;

// i18n
const t = translate;

const {
  post,
} = useRequest();

const usePluginList = () => {
  // router
  const router = useRouter();

  // store
  const ns = 'plugin';
  const store = useStore<RootStoreState>();
  const {commit} = store;
  const {
    plugin: state,
  } = store.state;

  // services
  const {
    getList,
    deleteById,
  } = usePluginService(store);

  // nav actions
  const navActions = computed<ListActionGroup[]>(() => [
    {
      name: 'common',
      children: [
        {
          buttonType: 'label',
          label: t('views.plugins.navActions.install.label'),
          tooltip: t('views.plugins.navActions.install.tooltip'),
          icon: ['fa', 'download'],
          type: 'success',
          onClick: () => {
            commit(`${ns}/showDialog`, 'install');

            sendEvent('click_plugin_list_install');
          }
        }
      ]
    },
    {
      name: 'settings',
      children: [
        {
          buttonType: 'label',
          label: t('views.plugins.navActions.settings.label'),
          tooltip: t('views.plugins.navActions.settings.tooltip'),
          icon: ['fa', 'cog'],
          type: 'primary',
          onClick: () => {
            commit(`${ns}/showDialog`, 'settings');

            sendEvent('click_plugin_list_settings');
          }
        }
      ]
    }
  ]);

  // table columns
  const tableColumns = computed<TableColumns<Plugin>>(() => [
    {
      key: 'name', // name
      label: t('views.plugins.table.columns.name'),
      icon: ['fa', 'font'],
      width: '250',
      value: (row: Plugin) => h(NavLink, {
        path: `/plugins/${row._id}`,
        label: row.name || row.full_name || row._id,
      }),
      hasSort: true,
      hasFilter: true,
      allowFilterSearch: true,
    },
    {
      key: 'status',
      label: t('views.plugins.table.columns.status'),
      icon: ['fa', 'check-square'],
      width: '120',
      value: (row: Plugin) => {
        if (row.deploy_mode === PLUGIN_DEPLOY_MODE_MASTER || row.status?.length === 1) {
          const status = row.status?.[0];
          return h(PluginStatus, {...status} as PluginStatusProps);
        } else if (row.deploy_mode === PLUGIN_DEPLOY_MODE_ALL) {
          return h(PluginStatusMultiNode, {status: row.status} as PluginStatusMultiNodeProps);
        }
      },
    },
    {
      key: 'pid',
      label: t('views.plugins.table.columns.processId'),
      icon: ['fa', 'microchip'],
      width: '120',
      value: (row: Plugin) => {
        return h(PluginPid, {status: row.status} as PluginPidProps);
      },
    },
    {
      key: 'description',
      label: t('views.plugins.table.columns.description'),
      icon: ['fa', 'comment-alt'],
      width: 'auto',
      hasFilter: true,
      allowFilterSearch: true,
    },
    {
      key: TABLE_COLUMN_NAME_ACTIONS,
      label: t('components.table.columns.actions'),
      fixed: 'right',
      width: '200',
      buttons: (row: Plugin) => {
        let buttons: TableColumnButton[];

        buttons = [
          {
            type: 'success',
            icon: ['fa', 'play'],
            tooltip: t('common.actions.start'),
            onClick: async (row) => {
              sendEvent('click_plugin_list_actions_start');

              await ElMessageBox.confirm(
                t('common.messageBox.confirm.start'),
                t('common.actions.start'),
                {type: 'warning'},
              );

              sendEvent('click_plugin_list_actions_start_confirm');

              await post(`/plugins/${row._id}/start`);
              await ElMessage.success(t('common.message.success.start'));
              await store.dispatch(`${ns}/getList`);
            },
            disabled: (row: Plugin) => {
              if (row.status?.length === 1) {
                return [
                  PLUGIN_STATUS_INSTALLING,
                  PLUGIN_STATUS_RUNNING,
                ].includes(row.status[0].status);
              } else if (row.status) {
                for (const s of row.status) {
                  if ([
                    PLUGIN_STATUS_INSTALL_ERROR,
                    PLUGIN_STATUS_STOPPED,
                    PLUGIN_STATUS_ERROR,
                  ].includes(s.status)) {
                    return false;
                  }
                }
                return true;
              } else {
                return true;
              }
            },
          },
          {
            type: 'info',
            size: 'mini',
            icon: ['fa', 'stop'],
            tooltip: t('common.actions.stop'),
            onClick: async (row) => {
              sendEvent('click_plugin_list_actions_stop');

              await ElMessageBox.confirm(
                t('common.messageBox.confirm.stop'),
                t('common.actions.stop'),
                {type: 'warning'},
              );

              sendEvent('click_plugin_list_actions_stop_confirm');

              await ElMessage.info(t('common.message.info.stop'));
              await post(`/plugins/${row._id}/stop`);
              await store.dispatch(`${ns}/getList`);
            }, disabled: (row: Plugin) => {
              if (row.status?.length === 1) {
                return [
                  PLUGIN_STATUS_INSTALL_ERROR,
                  PLUGIN_STATUS_STOPPED,
                  PLUGIN_STATUS_ERROR,
                ].includes(row.status[0].status);
              } else if (row.status) {
                for (const s of row.status) {
                  if ([
                    PLUGIN_STATUS_INSTALLING,
                    PLUGIN_STATUS_RUNNING,
                  ].includes(s.status)) {
                    return false;
                  }
                }
                return true;
              } else {
                return true;
              }
            },
          },
        ];

        // default
        buttons = buttons.concat([
          {
            type: 'primary',
            icon: ['fa', 'search'],
            tooltip: t('common.actions.view'),
            onClick: (row) => {
              router.push(`/plugins/${row._id}`);

              sendEvent('click_plugin_list_actions_view');
            },
          },
          {
            type: 'danger',
            size: 'mini',
            icon: ['fa', 'trash-alt'],
            tooltip: t('common.actions.delete'),
            disabled: (row: Plugin) => !!row.active,
            onClick: async (row: Plugin) => {
              sendEvent('click_plugin_list_actions_delete');

              const res = await ElMessageBox.confirm(
                t('common.messageBox.confirm.delete'),
                t('common.actions.delete'),
                {
                  type: 'warning',
                  confirmButtonClass: 'el-button--danger'
                },
              );

              sendEvent('click_plugin_list_actions_delete_confirm');

              if (res) {
                await deleteById(row._id as string);
              }
              await Promise.all([
                getList(),
                store.dispatch(`${ns}/getAllList`),
              ]);
            },
          },
        ]);
        return buttons;
      },
      disableTransfer: true,
    }
  ]);

  // options
  const opts = getDefaultUseListOptions<Plugin>(navActions, tableColumns);

  // init
  setupListComponent(ns, store, []);

  onBeforeMount(async () => {
    // get base url
    await store.dispatch(`${ns}/getSettings`);
  });

  const saveBaseUrl = async (value: string) => {
    await store.dispatch(`${ns}/saveBaseUrl`, value);
  };

  const onBaseUrlChange = async (value: string) => {
    await saveBaseUrl(value);
  };

  return {
    ...useList<Plugin>(ns, store, opts),
    saveBaseUrl,
    onBaseUrlChange,
  };
};

export default usePluginList;

<template>
  <v-container
    id="data-tables"
    tag="section"
  >
    <loading
      :active.sync="loading"
      :loader="loaderOptions.loader"
      :color="loaderOptions.color"
      :width="loaderOptions.width"
      :height="loaderOptions.height"
      :background-color="loaderOptions.backgroundColor"
      :is-full-page="loaderOptions.isFullPage"
    />
    <qr-scanner/>
    <base-v-component
      heading="Sensors assignment"
      link="components/data-tables"
    />

    <base-material-card
      color="purple"
      icon="mdi-wifi"
      inline
      class="px-5 py-3"
    >
      <template v-slot:after-heading>
        <div class="display-2 font-weight-light">
          Spare parts list
        </div>
      </template>
      <v-divider class="mt-3" />

      <v-data-table
        :headers="headers"
        :items="searchedData"
        :server-items-length="count"
        :options.sync="options"
        :loading="loading"
        :footer-props="{
          itemsPerPageOptions: [10, 50, 100]
        }"
      >
        <template v-slot:top>

          <v-toolbar flat>
            <v-text-field
              v-model="search"
              label="Search"
              prepend-inner-icon="mdi-magnify"
              class="mx-4 mt-4"
            />
            <v-btn
              elevation="1"
              color="green"
              dark
              min-width="0"
              max-width="41"
              class="mx-4"
              v-if="isAdmin"
            >
              <v-icon
                @click="onAddClick"
                v-text="'mdi-plus'"
              />
            </v-btn>
          </v-toolbar>
        </template>
        <template v-slot:item="{ item }">
          <tr v-on:click="onClick(item)">
            <td>
              <div
                class="headline"
                v-text="item.name"
              />
            </td>
            <td>
              <div
                class="body-1"
                v-text="getMachiens(item.machines)"
              />
            </td>
            <td>
              <div
                class="body-1"
                v-text="item.price ? (item.price + '$') : ''"
              />
            </td>
            <td v-if="isAdmin">
              <v-btn
                v-for="(action, actionIndex) in actions"
                :key="actionIndex"
                fab
                icon
                @click="actionClicked(action.action, item.id)"
              >
                <v-icon
                  large
                  :color="action.color"
                  v-text="action.icon"
                />
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </base-material-card>
    <v-dialog
      v-model="removeDialog.state"
      max-width="300"
    >
      <v-card>
        <v-card-title>
          {{ removeDialog.message }}
          <v-spacer />

          <v-icon
            aria-label="Close"
            @click="dialog3 = false"
          >
            mdi-close
          </v-icon>
        </v-card-title>

        <v-card-text class="pb-6 pt-12 text-center">
          <v-btn
            class="mr-3"
            text
            @click="removeDialog.state = false"
          >
            No
          </v-btn>

          <v-btn
            color="success"
            text
            @click="[removeDialog.state = false, remove()]"
          >
            Yes
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
    <base-material-snackbar
      v-model="snackbar.snackbar"
      :type="snackbar.type"
      v-bind="{
        top : true
      }"
    >
      {{ snackbar.message }}
    </base-material-snackbar>
  </v-container>
</template>

<script>
  import { mapState ,mapGetters} from 'vuex'
  import QrScanner from '@/views/routes/SpareParts/SparePartsQRScanner'
  export default {
    name: 'SparePartsList',
    components: {QrScanner},
    data: () => ({
      data: [],
      searchedData: [],
      currentId: '',
      count: 0,
      search: '',
      loading: true,
      options: {},
      removeDialog: {
        state: false,
        message: '',
      },
      snackbar: {
        snackbar: false,
        type: 'success',
        message: '',
      },
      dataTable: {
        page: 1,
        start: 0,
        sortDesc: true,
        sortBy: 'received',
        limit: 10,
        url: '/graphql',
      },
      actions: [
        {
          color: 'blue',
          icon: 'mdi-cog',
          action: 'modify',
        },
        {
          color: 'red',
          icon: 'mdi-minus-circle-outline',
          action: 'remove',
        },
      ],
    }),
    computed: {
      ...mapState({
        loaderOptions: state => state.settings.loader,
        company: state => state.auth.company.id
      }),
      ...mapGetters({
        isAdmin: 'auth/isAdmin'
      }),
      headers: function() {
        if (this.isAdmin) {
          return ([
            {
              text: 'Name',
              value: 'name',
            },
            {
              text: 'Machine',
              value: 'subMachine',
            },
            {
              text: 'Price',
              value: 'price',
            },
            {
              text: 'Options',
              value: 'options',
            },
          ])
        } else {
          return ([
            {
              text: 'Name',
              value: 'name',
            },
            {
              text: 'Machine',
              value: 'subMachine',
            },
            {
              text: 'Price',
              value: 'price',
            }
          ])
        }
      },
      baseAPIUrl () {
        return process.env.VUE_APP_API_BASE_URL
      },
    },
    watch: {
      options: {
        async handler (newOptions) {
          // Set the data to match the database query
          this.dataTable.page = newOptions.page;
          this.dataTable.limit = newOptions.itemsPerPage;
          this.dataTable.sortDesc = newOptions.sortDesc[0];
          this.dataTable.sortBy = newOptions.sortBy[0];
          this.dataTable.start = this.dataTable.limit * (this.dataTable.page - 1);
          // Refetch readings with new options
          return this.getSparePartFilter().then((res) => {
            if (res) {
              this.data = res;
              this.searchedData = res;
            }
          })
        },
        deep: true,
      },
      search: function(newVal, oldVal) {
        this.searchedData = this.data.filter(item => {
          return item.name.toLowerCase().includes(newVal.toLowerCase());
        })
      }
    },
    async mounted () {
      // Get the Data when mounted
      this.loading = true;
      this.data = await this.getSparePartList();
      this.searchedData = this.data;
      this.loading = false
    },
    methods: {
      getMachiens(data) {
        let name = "";
        if (data.length === 0) {
          return false;
        }
        data.forEach(item => {
          name += item.name + ' ,'
        });
        return name.slice(0, -1);
      },
      remove () {
        return this.$axios({
          method: 'POST',
          url: '/graphql',
          data: {
            query: `mutation {
            deleteSparePart(input:{where: {id: "${this.currentId}"} }) {
              sparePart {
                id
              }
            }
          }
        `,
          },
        })
          .then(async ({ data }) => {
            this.snackbar = {
              message: 'A Sensor has been successfully removed.',
              type: 'success',
              snackbar: true,
            };
            // Refetch Sensors
            await this.getSparePartFilter().then((res) => {
              this.data = res;
              this.searchedData = res;
            });
            return data.data.spareParts
          })
          .catch(err => {
            this.snackbar = {
              message: `There was an error adding your request. Message: ${err.message}`,
              type: 'error',
              snackbar: true,
            }
          })
      },
      onAddClick () {
        this.$router.push('/spare-parts/sparepart-form')
      },
      onEditClick (action, id) {
        this.$router.push({ name: 'SparePartFormAction', params: { action, id } })
      },
      onClick(item) {
        if (!this.isAdmin) {
          this.$router.push({ name: 'SparePartFormAction', params: { action: 'modify', id: item.id } });
        }
      },
      actionClicked (action, id) {
        // Setting up the current ID which can be accessed from dialog
        this.currentId = id;
        switch (action) {
          case ('modify'):
            this.onEditClick(action, id);
            break;
          case ('remove'):
            this.removeDialog = {
              state: true,
              message: 'Are you sure you want to delete this sensor?',
            };
            break
        }
      },
      async getSparePartList (payload) {
        const url = '/graphql';
        return this.$axios({
          method: 'POST',
          url: url,
          data: {
            query: `
              {
                spareParts(where: {company: "${this.company}"}) {
                  id
                  name
                  machines {
                    name
                  }
                  price
                }
              }`,
          },
        }).then(async (res) => {
          const spareParts = res.data.data.spareParts;
          // Get data count
          this.count = await this.$axios({
            method: 'POST',
            url: url,
            data: {
              query: `{
                sparePartsConnection(where: {company: "${this.company}"}){
                  aggregate{
                    count
                  }
                }
              }`,
            },
          }).then((res) => {
            if (res.data.data.sparePartsConnection) {
              return res.data.data.sparePartsConnection.aggregate.count
            } else {
              return 0
            }
          });
          if (spareParts) {
            return spareParts
          } else {
            return []
          }
        })
      },

      async getSparePartFilter () {
        this.loading = true;
        let { url, limit, sortBy, sortDesc, start } = this.dataTable;
        // Sort desc when undefined (setting up the first load to be descending to show the latest first)
        if (sortDesc === undefined) {
          sortDesc = true
        }
        return this.$axios({
          method: 'POST',
          url: url || '/graphql',
          data: {
            query: `{
                  spareParts(where: {company: "${this.company}"}, limit: ${limit || 10}, sort: "${sortBy || 'name'}:${sortDesc ? 'desc' : 'asc'}", start: ${start || 0})
                  {
                    id
                    name
                    machines {
                      name
                    }
                    price
                  }
                }
              `,
          },
        }).then((res) => {
          this.loading = false;
          return res.data.data.spareParts
        })
          .catch((err) => console.log('error', err))
      },
    },
  }
</script>

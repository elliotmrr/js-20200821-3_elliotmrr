import fetchJson from './utils/fetch-json.js';

const BACKEND_URL = 'https://course-js.javascript.ru';

export default class SortableTable {
  element; // HTMLElement;
  subElements = {};
  data = [];
  loading = false;
  step = 20;
  start = 1;

  onWindowScroll = async () => {
    const { bottom } = this.element.getBoundingClientRect();
    const { id, order } = this.sorting;

    if (bottom < document.documentElement.clientHeight && !this.loading && !this.isSortLocally) {
      this.start = this.end;

      this.loading = true;

      const data = await this.loadData(id, order, this.start, this.end);
      this.update(data);

      this.loading = false;
    }
  };

  onSortClick = event => {
    const column = event.target.closest(".sortable-table__cell[data-sortable=true]");

    if (!column) {
      return;
    }

    const {id, order} = column.dataset;
    const newOrder = toggleOrder(order);

    this.sorted = {
      id,
      order: newOrder
    };

    this.sort(id, newOrder);

    function toggleOrder(order) {
      const orders = {
        asc: 'desc',
        desc: 'asc'
      };

      return orders[order];
    }
  };

  constructor(headersConfig = [], {
    url = '',
    sorting = {
      id: headersConfig.find(item => item.sortable).id,
      order: 'asc',
    },
    isSortLocally = false,
    step = 20,
    start = 1,
  } = {}) {
    this.headersConfig = headersConfig;
    this.url = new URL(url, BACKEND_URL);
    this.sorting = sorting;
    this.isSortLocally = isSortLocally;
    this.step = step;
    this.start = start;

    this.render();
  }

  initEventListeners() {
    this.header.addEventListener("pointerdown", this.onSortClick);
    document.addEventListener('scroll', this.onWindowScroll);
  }

  async render() {
    const $wrapper = document.createElement('div');
    $wrapper.innerHTML = this.table;
    const element = $wrapper.firstElementChild;

    this.element = element;
    this.subElements = this.getSubElements(element);

    const {id, order} = this.sorting;
    const data = await this.loadData(id, order, this.start, this.end);

    this.renderRowsFromServer(data);
    this.initEventListeners();
  }

  getTableHeaderCells({id, title, sortable}) {
    const order = sortable ? `data-order="${this.sorting.order}"` : "";

    return `
      <div class="sortable-table__cell" data-id="${id}" data-sortable="${sortable}" ${order}>
        <span>${title}</span>
        ${id === this.sorting.id ? this.headerSortingArrow : ""}
      </div>
    `;
  }

  getTableBodyRows(data) {
    return data.map(item => `
      <div class="sortable-table__row">
        ${this.getTableBodyCells(item, data)}
      </div>`
    ).join('');
  }

  getTableBodyCells(item) {
    const cells = this.headersConfig.map(({id, template}) => {
      return {
        id,
        template
      };
    });

    return cells.map(({id, template}) => {
      return template
        ? template(item[id])
        : `<div class="sortable-table__cell">${item[id]}</div>`;
    }).join('');
  }

  setTableBodyRowsFromServer(data) {
    this.data = data;

    this.body.innerHTML = this.getTableBodyRows(data);
  }

  update(data) {
    const rows = document.createElement('div');

    this.data = [...this.data, ...data];
    rows.innerHTML = this.getTableBodyRows(data);

    this.body.append(...rows.childNodes);
  }

  renderRowsFromServer(data) {
    if (data.length) {
      this.element.classList.remove('sortable-table_empty');
      this.setTableBodyRowsFromServer(data);
    } else {
      this.element.classList.add('sortable-table_empty');
    }
  }

  async loadData(id, order, start = this.start, end = this.end) {
    this.url.searchParams.set('_sort', id);
    this.url.searchParams.set('_order', order);
    this.url.searchParams.set('_start', start);
    this.url.searchParams.set('_end', end);

    this.element.classList.add('sortable-table_loading');

    const data = await fetchJson(this.url);

    this.element.classList.remove('sortable-table_loading');

    return data;
  }

  setCaret(field, order) {
    const column = this.header.querySelector(`[data-id="${field}"]`);

    column.dataset.order = order;
    column.append(this.arrow);
  }

  sort(field, order) {
    this.setCaret(field, order);

    if (this.isSortLocally) {
      this.sortLocally(field, order);
    } else {
      this.sortOnServer(field, order, this.start, this.end);
    }
  }

  sortLocally(field, order) {
    const sortedData = this.sortData(field, order);

    this.body.innerHTML = this.getTableBodyRows(sortedData);
  }

  async sortOnServer(field, order, start, end) {
    const data = await this.loadData(field, order, start, end);

    this.renderRowsFromServer(data);
  }

  sortData(id, order = 'asc') {
    const arr = [...this.data];
    const column = this.headersConfig.find(item => item.id === id);
    const {sortType, customSorting} = column;
    const direction = order === 'asc' ? 1 : -1;

    return arr.sort((a, b) => {
      switch (sortType) {
      case 'number':
        return direction * (a[id] - b[id]);
      case 'string':
        return direction * a[id].localeCompare(b[id], ['ru', 'en']);
      case 'custom':
        return direction * customSorting(a, b);
      default:
        return direction * (a[id] - b[id]);
      }
    });
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  deinEventListeners() {
    document.removeEventListener('scroll', this.onWindowScroll);
  }

  remove () {
    this.element.remove();
    this.deinEventListeners();
  }

  destroy() {
    this.remove();
    this.subElements = {};
  }

  get table() {
    return `
      <div class="sortable-table">
        ${this.tableHeader}
        ${this.tableBody}

        <div data-element="loading" class="loading-line sortable-table__loading-line"></div>

        <div data-element="emptyPlaceholder" class="sortable-table__empty-placeholder">
          <div>
            <p>No products satisfies your filter criteria</p>
            <button type="button" class="button-primary-outline">Reset all filters</button>
          </div>
        </div>
      </div>
    `;
  }

  get tableHeader() {
    return `
      <div data-element="header" class="sortable-table__header sortable-table__row">
        ${this.headersConfig.map(item => this.getTableHeaderCells(item)).join('')}
      </div>
    `;
  }

  get headerSortingArrow() {
    return `
      <span data-element="arrow" class="sortable-table__sort-arrow">
        <span class="sort-arrow"></span>
      </span>
    `;
  }

  get tableBody() {
    return `
      <div data-element="body" class="sortable-table__body">
        ${this.getTableBodyRows(this.sortData(this.sorting.id))}
      </div>
    `;
  }

  get arrow() {
    return this.subElements.arrow;
  }

  set arrow(arrow) {
    this.subElements.arrow = arrow;
  }

  get header() {
    return this.subElements.header;
  }

  set header(header) {
    this.subElements.arrow = header;
  }

  get body() {
    return this.subElements.body;
  }

  set body(body) {
    this.subElements.arrow = body;
  }

  get end() {
    return this.start + this.step;
  }
}

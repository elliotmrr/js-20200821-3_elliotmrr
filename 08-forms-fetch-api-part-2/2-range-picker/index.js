const LOCALES = ["ru-RU", "ru-BY", "en-GB", "en-US"];

export default class RangePicker {
  element = null;
  selectingFrom = true;
  subElements = {};
  selected = {};

  static formatDate(date) {
    return date.toLocaleDateString(LOCALES, {dateStyle: 'short'});
  }

  onDocumentClick = event => {
    const isOpen = this.element.classList.contains('rangepicker_open');
    const isRangePicker = this.element.contains(event.target);

    if (isOpen && !isRangePicker) {
      this.close();
    }
  };

  constructor({
    from,
    to = new Date(),
  } = {}) {
    if (!from) {
      from = new Date(to);
      from.setMonth(to.getMonth() - 2);
    }

    this.selected = {from, to};
    this.showDateFrom = new Date(from);

    this.render();
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.template;
    this.element = wrapper.firstElementChild;

    this.subElements = this.getSubElements(this.element);
    this.initEventListeners();
  }

  initEventListeners() {
    const {input, selector} = this.subElements;

    document.addEventListener('click', this.onDocumentClick, true);

    input.addEventListener('click', () => this.toggle());
    selector.addEventListener('click', event => this.onSelectorClick(event));
  }

  renderDateRangePicker() {
    const from = new Date(this.showDateFrom);
    const to = new Date(this.showDateFrom);

    to.setMonth(to.getMonth() + 1);

    this.renderCalendar({from, to});

    this.renderHighlight();
  }

  renderCalendar({from, to}) {
    const { selector } = this.subElements;

    const arrow = document.createElement("div");
    arrow.className = "rangepicker__selector-arrow";

    const controlLeft = document.createElement("div");
    controlLeft.className = "rangepicker__selector-control-left";
    controlLeft.addEventListener('click', () => this.prev());

    const controlRight = document.createElement("div");
    controlRight.className = "rangepicker__selector-control-right";
    controlRight.addEventListener('click', () => this.next());

    selector.innerHTML = `
      ${this.getCalendar(from)}
      ${this.getCalendar(to)}
    `;

    selector.prepend(
      arrow,
      controlLeft,
      controlRight,
    );
  }

  getCalendar(givenDate) {
    const date = new Date(givenDate);

    return `
      <div class="rangepicker__calendar">
        ${this.getCalendarItems(date)}
      </div>
    `;
  }

  getCalendarItems(givenDate) {
    return `
      <div class="rangepicker__month-indicator">
        ${this.getMonthIndicator(givenDate)}
      </div>
      <div class="rangepicker__day-of-week">
        ${this.dayOfWeek}
      </div>
      <div class="rangepicker__date-grid">
        ${this.getDateGrid(givenDate)}
      </div>
    `;
  }

  getMonthIndicator(givenDate) {
    let monthStr = givenDate.toLocaleString(LOCALES, {month: 'long'});
    // monthStr = monthStr[0].toUpperCase() + monthStr.slice(1);

    return `
      <time datetime=${monthStr}>${monthStr}</time>
    `;
  }

  getDateGrid(givenDate) {
    const date = new Date(givenDate);
    const buttons = [];

    date.setDate(1);

    buttons.push(`
      <button
        type="button"
        class="rangepicker__cell"
        data-value="${date.toISOString()}"
        style="--start-from: ${[7, 1, 2, 3, 4, 5, 6][date.getDay()]}">
          ${date.getDate()}
      </button>
    `);

    date.setDate(2);

    while (date.getMonth() === givenDate.getMonth()) {
      buttons.push(`
        <button
          type="button"
          class="rangepicker__cell"
          data-value="${date.toISOString()}">
            ${date.getDate()}
        </button>
      `);

      date.setDate(date.getDate() + 1);
    }

    return buttons.join('');
  }

  close() {
    this.element.classList.remove('rangepicker_open');
  }

  toggle() {
    this.element.classList.toggle('rangepicker_open');
    this.renderDateRangePicker();
  }

  onSelectorClick({target}) {
    if (target.classList.contains('rangepicker__cell')) {
      this.onRangePickerCellClick(target);
    }
  }

  next() {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() + 1);
    this.renderDateRangePicker();
  }

  prev() {
    this.showDateFrom.setMonth(this.showDateFrom.getMonth() - 1);
    this.renderDateRangePicker();
  }

  onRangePickerCellClick(target) {
    const { value } = target.dataset;

    if (value) {
      const dateValue = new Date(value);

      if (this.selectingFrom) {
        this.selected = {
          from: dateValue,
          to: null
        };
        this.selectingFrom = false;
        this.renderHighlight();
      } else {
        if (dateValue > this.selected.from) {
          this.selected.to = dateValue;
        } else {
          this.selected.to = this.selected.from;
          this.selected.from = dateValue;
        }

        this.selectingFrom = true;
        this.renderHighlight();
      }

      if (this.selected.from && this.selected.to) {
        this.dispatchEvent();
        this.close();
        this.subElements.from.innerHTML = RangePicker.formatDate(this.selected.from);
        this.subElements.to.innerHTML = RangePicker.formatDate(this.selected.to);
      }
    }
  }

  renderHighlight() {
    const { from, to } = this.selected;
    const { selector } = this.subElements;

    for (const cell of selector.querySelectorAll('.rangepicker__cell')) {
      const { value } = cell.dataset;
      const cellDate = new Date(value);

      cell.classList.remove('rangepicker__selected-from');
      cell.classList.remove('rangepicker__selected-between');
      cell.classList.remove('rangepicker__selected-to');

      if (from && value === from.toISOString()) {
        cell.classList.add('rangepicker__selected-from');
      } else if (to && value === to.toISOString()) {
        cell.classList.add('rangepicker__selected-to');
      } else if (from && to && cellDate >= from && cellDate <= to) {
        cell.classList.add('rangepicker__selected-between');
      }
    }

    if (from) {
      const selectedFromElem = selector.querySelector(`[data-value="${from.toISOString()}"]`);
      if (selectedFromElem) {
        selectedFromElem.closest('.rangepicker__cell').classList.add('rangepicker__selected-from');
      }
    }

    if (to) {
      const selectedToElem = selector.querySelector(`[data-value="${to.toISOString()}"]`);
      if (selectedToElem) {
        selectedToElem.closest('.rangepicker__cell').classList.add('rangepicker__selected-to');
      }
    }
  }

  dispatchEvent() {
    this.element.dispatchEvent(new CustomEvent('date-select', {
      bubbles: true,
      detail: this.selected
    }));
  }

  getSubElements(element) {
    const elements = element.querySelectorAll('[data-element]');

    return [...elements].reduce((accum, subElement) => {
      accum[subElement.dataset.element] = subElement;

      return accum;
    }, {});
  }

  deinEventListeners() {
    document.removeEventListener('click', this.onDocumentClick, true);
  }

  remove () {
    this.element.remove();
    this.deinEventListeners();
  }

  destroy() {
    this.remove();
    this.element = null;
    this.selectingFrom = true;
    this.subElements = {};
    this.selected = {};

    return this;
  }

  get template() {
    const from = RangePicker.formatDate(this.selected.from);
    const to = RangePicker.formatDate(this.selected.to);

    return `<div class="rangepicker">
      <div class="rangepicker__input" data-element="input">
        <span data-element="from">${from}</span> -
        <span data-element="to">${to}</span>
      </div>
      <div class="rangepicker__selector" data-element="selector"></div>
    </div>`;
  }

  get dayOfWeek() {
    // TODO: Интернационализацию вынести наружу и дописать весь компонент
    const formatter = new Intl.DateTimeFormat(LOCALES, {weekday: "short"});
    const date = new Date(0);
    date.setDate(-2); // set on Monday
    formatter.format(date);

    const days = [];

    for (let i = 0; i < 7; i++) {
      days.push(`<div>${
        formatter.format(date)[0].toUpperCase() + formatter.format(date).slice(1)
      }</div>`);

      date.setDate(date.getDate() + 1);
    }

    return days.join('');
  }

}

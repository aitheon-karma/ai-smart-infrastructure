export class Search {
    term: string;
    categories: Array<string>;
    isFromCreatorsStudio: boolean;
    categoryName: string;
}

export class ProductFilters {

    constructor() {
        this.priceFilter = {
            max: 99999,
            min: 10,
            currentLeft: 10,
            currentRight: 99999,
        };
        this.stockFilter = {};
        this.stockStatusFilter = [];
        this.colorFilter = [];
        this.orgFilter = [];
        this.sortingProduct = '';
    }
    priceFilter: {
        max: number,
        min: number,
        currentLeft: number,
        currentRight: number,
    };

    stockFilter: any;
    stockStatusFilter: string[];
    colorFilter: string[];
    orgFilter: string[];
    sortingProduct: string;
    get showPriceFilter(): boolean {
        return (this.priceFilter.max !== this.priceFilter.currentRight)
            || (this.priceFilter.min !== this.priceFilter.currentLeft);
    }

    removePriceFilter() {
        this.priceFilter.currentLeft = this.priceFilter.min;
        this.priceFilter.currentRight = this.priceFilter.max;
    }

    addColor(colors: string) {
        const index = this.colorFilter.findIndex(color => color === colors);
        if (index === -1) { this.colorFilter.push(colors);console.log(this.colorFilter); }
    }


    addStockRange(min: number, max: number) {
       this.stockFilter = { min, max };
    }
    addStockFilter(stockName: string, isChecked: boolean) {
        console.log(stockName,isChecked);
        const index = this.stockStatusFilter.findIndex(stock => stock === stockName);
        if (index === -1) { this.stockStatusFilter.push(stockName); }
    }
    removeColor(colors: string) {
        const index = this.colorFilter.findIndex(color => color === colors);
        this.colorFilter.splice(index, 1);
    }
    isColorFiltered(colors: string) {
        return this.colorFilter.findIndex(brand => brand === colors) >= 0;
    }
    isOrgFiltered(org: string) {
        return this.orgFilter.findIndex(o => o === org) >= 0;
    }
    addOrganization(org: string) {
        const index = this.orgFilter.findIndex(r => r === org);
        if (index === -1) { this.orgFilter.push(org);console.log(this.orgFilter); }
    }
    removeOrganization(org: string) {
        const index = this.orgFilter.findIndex(o => o === org);
        this.orgFilter.splice(index, 1);
    }
    addSorting(event) {
        this.sortingProduct = event;
    }
}
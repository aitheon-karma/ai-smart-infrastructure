export class Supplier {
    _id: string;
    organaization: Organaization;
    delivery: DeliveryMethod
    price: Number;
    inStock: Boolean;
    rating: Number;
    reviewsCount: Number;

    constructor() { }
}
export class Organaization {
    name: String;
    image: String;
    link: String;
    profile: {
        website: String;
        avatarUrl: string;
    }
}

export class DeliveryMethod {
    delweek1: DeliveryWeekDetails;
    delweek2: DeliveryWeekDetails;
    delweek3: DeliveryWeekDetails;
    delweek4: DeliveryWeekDetails;
}

export class DeliveryWeekDetails {
    available: Boolean; 
    rate: Number;
}



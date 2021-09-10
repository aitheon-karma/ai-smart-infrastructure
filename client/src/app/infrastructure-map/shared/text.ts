export class Text {
  private text: any;

  constructor(
    public group: any,
    public name: string,
    public parameters: any,
    public type: string
  ) {
    this.createText();    
  }

  createText() {
    this.text = this.group.append('foreignObject')
                          .style('border-radius', '4px')
                          .attr('width', this.stringSizeHelper(this.name).width)
                          .attr('height', '28px');

    this.text.append('xhtml:div')
              .attr('class', 'hovered-text')
              .text(this.name || '')

    this.setCoordinates(this.parameters);
  }

  public onTextHover() {
    this.text.style('background', '#1a1a1a');
  }

  public onTextLeave() {
    this.text.style('background', 'transparent');
  }

  public updateText(name: string) {
    this.name = name;
    this.text.select('.hovered-text').text(name);              
    this.text.attr('width', this.stringSizeHelper(name).width);
  }

  public setCoordinates(parameters: any) {
    this.parameters = parameters;
    switch(this.type) {
      case 'AREA': 
        this.text.attr('x', parameters.x - (this.stringSizeHelper(this.name).width / 2))
                 .attr('y', parameters.y - 40);
      break;

      case 'STATION':
        this.text.attr('x', parameters.x + (parameters.width / 2) - (this.stringSizeHelper(this.name).width / 2))
                 .attr('y', parameters.y + parameters.height + 18);
      break;
    }
  }

  public getTextValue() {
    return this.text.text();
  }

  public stringSizeHelper(text: string) {
    const element = document.createElement('div');
    const textNode = document.createTextNode(text);
    element.appendChild(textNode);
  ​
    element.style.fontFamily = 'ProximaNova';
    element.style.fontSize = '14px';
    element.style.fontWeight = 'bold';
    element.style.position = 'absolute';
    element.style.visibility = 'hidden';
    element.style.left = '-999px';
    element.style.top = '-999px';
  ​
    document.body.appendChild(element);
    const size = {
      width: element.offsetWidth + 16,
      height: element.offsetHeight,
    };
    element.parentNode.removeChild(element);
    return size;
  }

  public hideShapeName() {
    this.text.style('display', 'none')
  }

  public showShapeName() {
    this.text.style('display', 'block')
  }

  public removeShapeName() {
    this.group.select('foreignObject').remove();
  }
}

import { Extension } from 'ng2-adsk-forge-viewer';
import { Subject } from 'rxjs';
 declare const THREE: any;
// import * as THREE from 'three';


export class MyExtension extends Extension {

  constructor(viewer: Autodesk.Viewing.GuiViewer3D, options: any) {
    super(viewer, options);
  }
  // Extension must have a name
  public static extensionName = 'MyExtension';

  public static clickedMesh = new Subject<any>();

  // Toolbar test
  // private subToolbar: Autodesk.Viewing.UI.ToolBar;
  // private onToolbarCreatedBinded: any;
  myViewer: Autodesk.Viewing.GuiViewer3D;
  dbIds: Array<number>;
  mesh: any;

  interval: any;



  public load() {
    // Called when Forge Viewer loads your extension
    // console.log('MyExtension loaded!');
    // @ts-ignore
    this.viewer.toolController.registerTool(this);


    // @ts-ignore
    this.viewer.toolController.activateTool(
      'Viewing.Extension.MeshSelection');


    if (!this.viewer) {
      return;
    }
    this.addToScene();

    this.viewer.addEventListener(
      Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, () => {
        this.dbIds = this.getAllDbIds();
      });

    this.viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, (e) => {

    });

    return true;
  }

  public unload() {
    // Must return true or extension will fail to unload
    // @ts-ignore
    this.viewer.toolController.deregisterTool(this);
    return true;
  }

  private addToScene() {

    const geom = new THREE.SphereGeometry(.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh( geom, material );
    this.viewer.impl.createOverlayScene('custom-scene');
    this.viewer.impl.addOverlay('custom-scene', this.mesh);

    this.viewer.impl.invalidate(true);
    this.mesh.position.set(2, 4, 3);


    this.interval = setInterval(() => {
      const x = this.mesh.position.x;
      // temp code will be removed when integrating
      if (!this.viewer.impl && this.interval) {
       return clearInterval(this.interval);
      }
      if (x < 8) {
        this.mesh.position.set(x + .1, 4, 3);
        this.viewer.impl.sceneUpdated(true);
        this.viewer.impl.invalidate(true);
      } else {
        clearInterval(this.interval);
      }

    }, 50);
  }

  getAllDbIds() {

    const {instanceTree} = this.viewer.model.getData();

    const {dbIdToIndex} = instanceTree.nodeAccess;

    return Object.keys(dbIdToIndex).map((dbId) => {
      return parseInt(dbId);
    });
  }

  pointerToRaycaster (domElement, camera, pointer) {

    const pointerVector = new THREE.Vector3();
    const pointerDir = new THREE.Vector3();
    const ray = new THREE.Raycaster();

    const rect = domElement.getBoundingClientRect();

    const x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;

    if (camera.isPerspective) {

      pointerVector.set(x, y, 0.5);

      pointerVector.unproject(camera);

      ray.set(camera.position,
        pointerVector.sub(
          camera.position).normalize());

    } else {

      pointerVector.set(x, y, -1);

      pointerVector.unproject(camera);

      pointerDir.set(0, 0, -1);

      ray.set(pointerVector,
        pointerDir.transformDirection(
          camera.matrixWorld));
    }

    return ray;
  }

  handleSingleClick (event) {
    const _viewer = this.viewer;
    const intersectObjects = (() => {
        const pointerVector = new THREE.Vector3();
        const pointerDir = new THREE.Vector3();
        const ray = new THREE.Raycaster();
        // @ts-ignore
        const camera = _viewer.impl.camera as any;

        return (pointer, objects, recursive) => {
            // @ts-ignore
            const rect = _viewer.impl.canvas.getBoundingClientRect();
            const x = (( pointer.clientX - rect.left) / rect.width ) * 2 - 1;
            const y = - (( pointer.clientY - rect.top) / rect.height ) * 2 + 1;

            if (camera.isPerspective) {
                pointerVector.set( x, y, 0.5 );
                pointerVector.unproject( camera );
                ray.set( camera.position, pointerVector.sub( camera.position ).normalize() );
            } else {
                pointerVector.set( x, y, -1 );
                pointerVector.unproject( camera );
                pointerDir.set( 0, 0, -1 );
                ray.set( pointerVector, pointerDir.transformDirection( camera.matrixWorld ) );
            }

            const intersections = ray.intersectObjects( objects, recursive );
            return intersections[0] ? intersections[0] : null;
        };
    })();
    const pointer = event.pointers ? event.pointers[ 0 ] : event;

        // @ts-ignore
        const result = intersectObjects( pointer, _viewer.impl.overlayScenes['custom-scene'].scene.children );

        if ( result && result.object ) {
            const mesh = result.object;
            // Change object color
            // let curColor = mesh.material.color;
            // curColor = ( curColor.getHex() === 0xff0000 ? 0x00ff00 : 0xff0000 );
            // mesh.material.color.setHex( curColor );
            this.viewer.impl.invalidate( false, true, true );
            MyExtension.clickedMesh.next(mesh);
        }

        return false;

  }


  getNames () {

    return ['Viewing.Extension.MeshSelection'];
  }

  getName () {

    return 'MyExtension';
  }

  activate () {

  }

  deactivate () {

  }

}

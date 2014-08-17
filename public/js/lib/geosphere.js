/**
 * Created by nicolasmondon on 16/08/2014.
 */
;!function(th, thx, $, Detector, win){

    var container, scene, camera, renderer, projector;
    var controls;


    function onSetup(raw){

        // width
        var w = win.innerWidth;
        // height
        var h = win.innerHeight;
        var viewAngle = 40;
        var aspect = w / h;
        var near = 0.1;
        var far = 20000;
        var axes;
        var skyBoxGeometry;
        var skyBoxMaterial;
        var skyBox;

        // set up dom ready callback
        $(onDomReady);

        // scene
        scene = new th.Scene();

        // camera
        camera = new th.PerspectiveCamera(viewAngle, aspect, near, far);
        // add the camera to the scene at the default position (0,0,0)
        scene.add(camera);
        // so pull it back
        camera.position.set(-600, 600, -600);
        // and set the angle towards the scene origin
        camera.lookAt(scene.position);

        // renderer
        if (Detector.webgl) {
            renderer = new th.WebGLRenderer({
                antialias: true
            });
        } else {
            renderer = new th.CanvasRenderer();
        }
        renderer.setSize(w, h);

        // container
        container = document.getElementById('container');
        // attach renderer to the container
        container.appendChild(renderer.domElement);

        // events
        // automatically resize renderer
        thx.WindowResize(renderer, camera);

        // controls
        controls = new th.OrbitControls(camera, renderer.domElement);

        // lights
        setupLight();

        // axes
        axes = new th.AxisHelper(100);
        scene.add(axes);

        // sky
        // ! make sure the camera's far is big enough to render the sky
        skyBoxGeometry = new th.BoxGeometry(10000, 10000, 10000);
        skyBoxMaterial = new th.MeshBasicMaterial({
            color: 0xffffff,
            side: th.BackSide
        });
        skyBox = new th.Mesh(skyBoxGeometry, skyBoxMaterial);
        scene.add(skyBox);

        // projector
        projector = new th.Projector();

        animate();
    };

    function onDomReady(){

    };

    // from http://stackoverflow.com/questions/15478093/realistic-lighting-sunlight-with-th-js
    function setupLight() {
        // lights
        var hemiLight = new th.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 500, 0);

        var dirLight = new th.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(-1, 0.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.name = 'dirlight';
        // dirLight.shadowCameraVisible = true;

        dirLight.castShadow = true;
        dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;

        var d = 300;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;

        scene.add(hemiLight);
        scene.add(dirLight);
    };

    function animate() {
        requestAnimationFrame(animate);
        render();
        update();
    };

    function update() {
        controls.update();
    };

    function render() {
        renderer.render(scene, camera);
    };

    $.getJSON('data/countries.geo.json').done(onSetup);

}(THREE, THREEx, jQuery, Detector, window);
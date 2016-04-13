var express = require('express'),
  router = express.Router(),
  bodyparser = require('body-parser'),
  fs = require('fs'),
  _ = require('lodash'),
  path = require('path'),
  glob = require('globby');

var protoPaths = {
  version: '/:phase/:version*',                     // e.g '/alpha/alpha-01/'
  step: '/:phase/:version*/app/:step',              // e.g '/alpha{{ proto.path }}/address'
  appsGlob: [
    __dirname + '/views/**/index.html',
    '!' + __dirname + '/views/index.html',
    '!' + __dirname + '/views/**/app/index.html',
    '!' + __dirname + 'views/includes/**/.*'
  ]
}

/**
 * for all routes provide some standard context data
 * TODO: refactor (this is brittle) but works for the Interaction Designer.
 */
router.use(function(req, res, next){

  // protoypes config obj
  var proto = {
    versions: [],
    stages: ['alpha']
  }

  // using glob pattern for the predefined folder structure to grep url and title
  glob.sync(protoPaths.appsGlob).forEach(function(p){
    var sp = p.split('/');
    var computedPath = _.join( _.slice( sp, ( _.indexOf(sp, 'views') +1 ) ), '/' );
    var title = computedPath.split('/')[1];
    proto.versions.push({ url: computedPath, title: (title[0].toUpperCase() + title.slice(1)).replace("-", ' ') });
  });

  // update locals so this data is accessible
  _.merge(res.locals,{
    postData: (req.body ? req.body : false),
    proto: proto
  });

  next();

});

/**
 * Just render the route index file
 */
router.get('/', function (req, res) {
    res.render('index');
});

/**
 * handle 'phase' (alpha/beta,etc) and 'version' of prototypes by passing some
 * enhanced context data (useful to nunjucks templates).
 */
router.all([protoPaths.version], function(req, res, next){
  _.merge(res.locals.proto, {
    title: 'Industrial Injuries Diablement Benefit - ' + req.params.phase,
    version: req.params.version,
    path: '/' + req.params.phase + '/' + req.params.version + '/app'
  });
  next();
});

/**
 * This will require a specific routes file for each version of the prototype
 * hopefully making maintainance a little easier
 */
router.use(protoPaths.step, function(req,res,next){

  var version = req.params.version,
      phase = req.params.phase,
      step = req.params.step,
      routeFilePath = __dirname + '/views/' + phase + '/' + version + '/version_routes.js';

      // temp until I put this in properly.
      // TODO: replace with node module / something final
      function existsSync(filePath){
        try {
          fs.statSync(filePath);
        } catch(err){
          if (err.code == 'ENOENT') return false;
        }
        return true;
      }

  if(version && phase && existsSync(routeFilePath)) {

    var versionRouter = require(routeFilePath)({
      path: protoPaths.step,
      phase: phase,
      version: version,
      step: step
    });

    router.use(versionRouter);

  }

  next();

});

/**
 * Handles some OLD routing in lieu of a proper solution.
 * makes param for 'step' available to the view via locals
 */
router.all(protoPaths.step, function(req,res,next){

  var version = req.params.version || false,
      step = req.params.step || false,
      p = {
        step: step
      }

  // update local proto obj with useful data
  res.locals.proto ? _.merge(res.locals.proto, p) : res.locals.proto = p;

  // which prototype version
  switch (version) {

    // version alpha-03
    case 'alpha-03':
      // which step
      switch (step) {
        case 'step2':
          if(req.body['employed'] === 'true' && req.body.selfemployed === 'false' && req.body.region === 'true') {
            next();
          } else {
            res.redirect('ineligible');
          }
          break;
        default:
          break;
      }
      break;

    // version alpha-04 - 06
    case 'alpha-04':
    case 'alpha-05':
    case 'alpha-06':
      switch (step) {
        case 'medical_consent':
          if(req.body['employed'] === 'true' && req.body.selfemployed === 'false' && req.body.region === 'true') {
            next();
          } else {
            res.redirect('ineligible');
          }
          break;
        case 'step2':
          if(req.body['medical-consent'] === 'true') {
            next();
          } else {
            res.redirect('ineligible');
          }
          break;
        default:
          break;
      }
    default:
      break;
  }

  next();

});

// add your routes here
module.exports = router;

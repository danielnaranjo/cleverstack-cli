var Promise = require( 'bluebird' )
  , async   = require( 'async' )
  , path    = require( 'path' )
  , semver  = require( 'semver' )
  , findit  = require( 'findit' )
  , utils   = require( path.join( __dirname, '..', 'utils' ) )

/**
 * Finds bower/package.json file, checks for the actual name, and returns
 * the name of the module and a type (frontend or backend) module.
 *
 * @param  {Object[]} utils.locations.get( )
 * @param  {String} moduleName
 * @param  {String} moduleVersion
 * @param  {String} [check=gt] Semver version satisfying ('gt' or 'lt')
 * @return {Promise}
 * @api public
 */

exports.findConfigAndVersionForModule = function ( locations, moduleName, moduleVersion, check ) {
  var def     = Promise.defer( )
    , _module = {};

  if (typeof check === "undefined" || check !== "lt") {
    check = 'gt';
  }

  // Detect the first location that we find..
  // and make sure the location matches npm/bower.json
  async.filter( locations, function ( location, next ) {
    var loc     = path.join( location.moduleDir, location.modulePath )
      , walk    = findit( loc )
      , found   = false;

    walk.on( 'directory', function ( dir, stat, stop ) {
      if (path.basename( dir ) !== "modules" && path.dirname( dir ).split( path.sep ).splice( -1 )[ 0 ] !== "modules") {
        return stop( );
      }
    } );

    walk.on( 'file', function ( pkgFilePath ) {
      var pkgFileName = path.basename( pkgFilePath );

      if ([ 'package.json', 'bower.json' ].indexOf( pkgFileName ) > -1) {
        var jsonConfig = require( pkgFilePath );

        if (pkgFileName.indexOf( 'package.json' ) > -1 && location.name === "frontend") {
          utils.fail( moduleName + ' is a backend module, please install from your project\'s root directory.', true );
        }
        else if (pkgFileName.indexOf( 'bower.json' ) > -1 && location.name === "backend") {
          utils.fail( moduleName + ' is a backend module, please install from your project\'s root directory.', true );
        }
        else if (semver[ check ]( jsonConfig.version, moduleVersion )) {
          utils.fail( moduleName + '\'s version is already ' + (check === "gt" ? 'greater' : 'lesser' ) + ' than ' + moduleVersion + ' (currently at version ' + jsonConfig.version + ')', true );
        }
        else if (jsonConfig.name === moduleName) {
          if (semver.eq( jsonConfig.version, moduleVersion )) {
            utils.fail( moduleName + ' is already at version' + jsonConfig.version, true );
          } else {
            found = true;
            _module = {
              name: moduleName + ( moduleVersion !== "*" ? '@' + moduleVersion : '' ),
              type:[ 'package.json' ].indexOf( pkgFileName ) > -1 ? 'backend' : 'frontend'
            };
          }
        }
      }
    } );

    walk.on( 'end', function ( ) {
      next( found );
    } );
  },
  function ( _location ) {
    def.resolve( _location.length > 0 ? _module : false );
  } );

  return def.promise;
}

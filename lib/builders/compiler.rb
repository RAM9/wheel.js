module Wheel
  module Compiler
    def self.root_dir
      @root_dir ||= File.expand_path(File.dirname(__FILE__) + "/../..")
    end

    def self.package_dir
      "#{root_dir}/package"
    end

    def self.source manifest
      files = []
      File.open("#{root_dir}/lib/wheel/manifests/#{manifest}.js").each_line do |line|
        matches = line.match /^\/\/= require (.*)/
        files << matches.captures.last if matches
      end

      source = ""
      files.each do |file|
        if file.match /^wheel\//
          source << File.read("#{root_dir}/lib/#{file}")
        else
          source << File.read("#{root_dir}/lib/wheel/manifests/#{file}")
        end
      end

      source
    end

    def self.rewrite manifest, source, filename = nil
      filename = manifest unless filename
      File.delete("#{package_dir}/#{manifest}.js") if File.exist?("#{package_dir}/#{manifest}.js")
      File.delete("#{package_dir}/#{manifest}.min.js") if File.exist?("#{package_dir}/#{manifest}.min.js")

      File.open("#{package_dir}/#{filename}.js", 'w') do |f|
        f.write source
      end

      File.open("#{package_dir}/#{filename}.min.js", 'w') do |f|
        f.write Uglifier.compile(source)
      end
    end

    def self.make manifest, filename = nil
      rewrite( manifest, source(manifest) , filename)
    end
  end
end

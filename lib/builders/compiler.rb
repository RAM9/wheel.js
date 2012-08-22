module Wheel
  module Compiler
    def self.root_dir
      @root_dir ||= File.expand_path(File.dirname(__FILE__) + "/../..")
    end

    def self.package_dir
      "#{root_dir}/package"
    end

    def self.source manifest
      manifest_relative_path = File.join(root_dir,
                                         'lib','wheel','manifests')

      files = []
      File.open(File.join(manifest_relative_path,"#{manifest}.js")).each_line do |line|
        if line =~ /^\/\/= require (.*)/
          files << File.join(manifest_relative_path,$1)
        elsif line =~ /^\/\/= require_tree (.*)/
          files = files + Dir[File.join(manifest_relative_path,$1,'**','*')]
        else
        end
      end

      source = ""
      files.each do |file|
          source << File.read(file)
      end

      source
    end

    def self.rewrite manifest, source, filename = nil
      filename = manifest unless filename
      File.delete("#{package_dir}/#{manifest}.js") if File.exist?("#{package_dir}/#{manifest}.js")
      File.delete("#{package_dir}/#{manifest}.min.js") if File.exist?("#{package_dir}/#{manifest}.min.js")

      File.open("#{package_dir}/#{filename}.js", File::RDWR|File::TRUNC|File::CREAT) do |f|
        f.write source
      end

      File.open("#{package_dir}/#{filename}.min.js", File::RDWR|File::TRUNC|File::CREAT) do |f|
        f.write Uglifier.compile(source)
      end
    end

    def self.make manifest, filename = nil
      rewrite( manifest, source(manifest) , filename)
    end
  end
end
